use std::{borrow::Cow, ops::Deref};

use candid::{decode_one, encode_one, CandidType, Deserialize, Principal};
use ic_stable_structures::storable::{Blob, Bound, Storable};
use shared::types::{
    personal_note_share::MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES, tip::MAX_TIP_ID_BYTES,
    token_id::TokenId,
};

#[derive(Default)]
pub struct Candid<T>(pub T)
where
    T: CandidType + for<'de> Deserialize<'de>;

impl<T> Storable for Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(candid::encode_one(&self.0).expect("encoding should always succeed"))
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(candid::decode_one(bytes.as_ref()).expect("decoding should succeed"))
    }
}

impl<T> Deref for Candid<T>
where
    T: CandidType + for<'de> Deserialize<'de>,
{
    type Target = T;

    fn deref(&self) -> &T {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredPrincipal(pub Principal);

impl Storable for StoredPrincipal {
    const BOUND: Bound = Blob::<29>::BOUND;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(
            Blob::<29>::try_from(self.0.as_slice())
                .expect("principal length should not exceed 29 bytes")
                .to_bytes()
                .into_owned(),
        )
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(Principal::from_slice(
            Blob::<29>::from_bytes(bytes).as_slice(),
        ))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredTokenId(pub TokenId);

impl Storable for StoredTokenId {
    // TokenId includes String, so treat it as unbounded.
    // The bounding is applied when a user saves a custom token.
    // TODO: add maximum size expectations or validation to ensure token IDs limits
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(encode_one(&self.0).expect("failed to candid-encode TokenId"))
    }

    fn into_bytes(self) -> Vec<u8> {
        encode_one(&self.0).expect("failed to candid-encode TokenId")
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(decode_one(bytes.as_ref()).expect("failed to candid-decode TokenId"))
    }
}

/// Composite key for per-user, per-token transaction storage.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct UserTransactionKey(pub StoredPrincipal, pub StoredTokenId);

impl Storable for UserTransactionKey {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let principal_bytes = self.0.to_bytes();
        let token_id_bytes = self.1.to_bytes();
        let principal_len =
            u32::try_from(principal_bytes.len()).expect("principal length should fit in u32");
        let mut buf = Vec::with_capacity(4 + principal_bytes.len() + token_id_bytes.len());
        buf.extend_from_slice(&principal_len.to_be_bytes());
        buf.extend_from_slice(&principal_bytes);
        buf.extend_from_slice(&token_id_bytes);
        Cow::Owned(buf)
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        let principal_len = u32::from_be_bytes(
            bytes[..4]
                .try_into()
                .expect("failed to decode principal length"),
        ) as usize;
        let principal = StoredPrincipal::from_bytes(Cow::Borrowed(&bytes[4..4 + principal_len]));
        let token_id = StoredTokenId::from_bytes(Cow::Borrowed(&bytes[4 + principal_len..]));
        Self(principal, token_id)
    }
}

/// Composite key for per-user active-transaction storage.
///
/// Encoding mirrors [`UserTransactionKey`]: `[u32 BE principal_len][principal_bytes][id_bytes]`.
/// The length-prefixed principal lets us range-scan all entries belonging to
/// a given principal by starting at `(principal, "")` and stopping when the
/// principal component changes.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct ActiveUserTransactionKey(pub StoredPrincipal, pub String);

impl Storable for ActiveUserTransactionKey {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let principal_bytes = self.0.to_bytes();
        let id_bytes = self.1.as_bytes();
        let principal_len =
            u32::try_from(principal_bytes.len()).expect("principal length should fit in u32");
        let mut buf = Vec::with_capacity(4 + principal_bytes.len() + id_bytes.len());
        buf.extend_from_slice(&principal_len.to_be_bytes());
        buf.extend_from_slice(&principal_bytes);
        buf.extend_from_slice(id_bytes);
        Cow::Owned(buf)
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        let principal_len = u32::from_be_bytes(
            bytes[..4]
                .try_into()
                .expect("failed to decode principal length"),
        ) as usize;
        let principal = StoredPrincipal::from_bytes(Cow::Borrowed(&bytes[4..4 + principal_len]));
        let id = std::str::from_utf8(&bytes[4 + principal_len..])
            .expect("active user transaction id should be valid UTF-8")
            .to_owned();
        Self(principal, id)
    }
}

/// The map key for a personal-note share: the opaque, client-generated random
/// token. Bounded (not fixed-size) — the client is expected to generate a
/// 128-bit token, but the bound only enforces generous headroom over that.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct PersonalNoteShareToken(pub String);

impl Storable for PersonalNoteShareToken {
    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES,
        is_fixed_size: false,
    };

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Borrowed(self.0.as_bytes())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.into_bytes()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(
            String::from_utf8(bytes.into_owned())
                .expect("personal note share token should be valid UTF-8"),
        )
    }
}

/// Composite key for the by-creator share index: `(creator, token)`. Lets a
/// cap check range-scan a single creator's shares without touching the
/// (potentially much larger) primary token-keyed map. Encoding mirrors
/// [`ActiveUserTransactionKey`]: `[u32 BE principal_len][principal_bytes][token_bytes]`.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct PersonalNoteShareCreatorKey(pub StoredPrincipal, pub PersonalNoteShareToken);

impl Storable for PersonalNoteShareCreatorKey {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let principal_bytes = self.0.to_bytes();
        let token_bytes = self.1.to_bytes();
        let principal_len =
            u32::try_from(principal_bytes.len()).expect("principal length should fit in u32");
        let mut buf = Vec::with_capacity(4 + principal_bytes.len() + token_bytes.len());
        buf.extend_from_slice(&principal_len.to_be_bytes());
        buf.extend_from_slice(&principal_bytes);
        buf.extend_from_slice(&token_bytes);
        Cow::Owned(buf)
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        let principal_len = u32::from_be_bytes(
            bytes[..4]
                .try_into()
                .expect("failed to decode principal length"),
        ) as usize;
        let principal = StoredPrincipal::from_bytes(Cow::Borrowed(&bytes[4..4 + principal_len]));
        let token = PersonalNoteShareToken::from_bytes(Cow::Borrowed(&bytes[4 + principal_len..]));
        Self(principal, token)
    }
}

/// Composite key for per-contact image storage: `(principal, contact_id)`.
///
/// Encoding mirrors [`ActiveUserTransactionKey`]: `[u32 BE principal_len][principal_bytes][u64 BE
/// contact_id]`. The length-prefixed principal groups a principal's images together, so the
/// per-principal image cap can be counted with a key-only range scan instead of loading the image
/// bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct ContactImageKey(pub StoredPrincipal, pub u64);

impl Storable for ContactImageKey {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let principal_bytes = self.0.to_bytes();
        let principal_len =
            u32::try_from(principal_bytes.len()).expect("principal length should fit in u32");
        let mut buf = Vec::with_capacity(4 + principal_bytes.len() + 8);
        buf.extend_from_slice(&principal_len.to_be_bytes());
        buf.extend_from_slice(&principal_bytes);
        buf.extend_from_slice(&self.1.to_be_bytes());
        Cow::Owned(buf)
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        let principal_len = u32::from_be_bytes(
            bytes[..4]
                .try_into()
                .expect("failed to decode principal length"),
        ) as usize;
        let principal = StoredPrincipal::from_bytes(Cow::Borrowed(&bytes[4..4 + principal_len]));
        let contact_id = u64::from_be_bytes(
            bytes[4 + principal_len..]
                .try_into()
                .expect("failed to decode contact id"),
        );
        Self(principal, contact_id)
    }
}

#[cfg(test)]
mod contact_image_key_tests {
    use std::borrow::Cow;

    use candid::Principal;
    use ic_stable_structures::storable::Storable;

    use super::{ContactImageKey, StoredPrincipal};

    fn principal(byte: u8) -> StoredPrincipal {
        StoredPrincipal(Principal::from_slice(&[byte; 29]))
    }

    fn encoded(key: &ContactImageKey) -> Vec<u8> {
        key.to_bytes().into_owned()
    }

    #[test]
    fn round_trips_through_bytes() {
        for id in [0u64, 1, 42, u64::MAX] {
            let key = ContactImageKey(principal(7), id);
            let decoded = ContactImageKey::from_bytes(Cow::Owned(encoded(&key)));

            assert_eq!(decoded, key);
        }
    }

    #[test]
    fn orders_a_principals_images_by_contact_id() {
        // The map ranges on the encoded bytes, so that is the ordering the cap scan depends on.
        let low = encoded(&ContactImageKey(principal(7), 1));
        let high = encoded(&ContactImageKey(principal(7), 2));

        assert!(low < high);
    }

    #[test]
    fn keeps_each_principals_images_contiguous() {
        // The cap scan starts at (principal, 0) and take_whiles on the principal, so no other
        // principal's key may sort between two of this principal's keys.
        let target = principal(7);
        let other = principal(8);

        let start = encoded(&ContactImageKey(target, 0));
        let end = encoded(&ContactImageKey(target, u64::MAX));

        for id in [0u64, 1, u64::MAX] {
            let intruder = encoded(&ContactImageKey(other, id));
            assert!(
                intruder < start || intruder > end,
                "a different principal's key sorted inside the target principal's range"
            );
        }
    }

    #[test]
    fn scan_start_sorts_at_or_below_every_key_for_that_principal() {
        let target = principal(7);
        let start = encoded(&ContactImageKey(target, 0));

        for id in [0u64, 1, 500, u64::MAX] {
            assert!(start <= encoded(&ContactImageKey(target, id)));
        }
    }
}

/// Primary key of the tip store: the opaque, client-generated tip id that also
/// appears as `<id>` in the share link. Bounded (not fixed-size) — the client
/// generates a 128-bit id, but the bound only enforces generous headroom.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct TipId(pub String);

impl Storable for TipId {
    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_TIP_ID_BYTES,
        is_fixed_size: false,
    };

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Borrowed(self.0.as_bytes())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.into_bytes()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(String::from_utf8(bytes.into_owned()).expect("tip id should be valid UTF-8"))
    }
}

/// Key of the by-sender index over the tip store, laid out so that one
/// sender's tips form a contiguous range: `[u32 BE principal_len][principal_bytes][tip_id_bytes]`.
/// Same encoding as [`PersonalNoteShareCreatorKey`], for the same reason — a
/// length-prefixed principal keeps the range scan exact even though principals
/// vary in length.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct TipSenderKey(pub StoredPrincipal, pub TipId);

impl Storable for TipSenderKey {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let principal_bytes = self.0.to_bytes();
        let tip_id_bytes = self.1.to_bytes();
        let principal_len =
            u32::try_from(principal_bytes.len()).expect("principal length should fit in u32");
        let mut buf = Vec::with_capacity(4 + principal_bytes.len() + tip_id_bytes.len());
        buf.extend_from_slice(&principal_len.to_be_bytes());
        buf.extend_from_slice(&principal_bytes);
        buf.extend_from_slice(&tip_id_bytes);
        Cow::Owned(buf)
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        let principal_len = u32::from_be_bytes(
            bytes[..4]
                .try_into()
                .expect("failed to decode principal length"),
        ) as usize;
        let principal = StoredPrincipal::from_bytes(Cow::Borrowed(&bytes[4..4 + principal_len]));
        let tip_id = TipId::from_bytes(Cow::Borrowed(&bytes[4 + principal_len..]));
        Self(principal, tip_id)
    }
}
