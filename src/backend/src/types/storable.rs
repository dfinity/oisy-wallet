use std::{borrow::Cow, ops::Deref};

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::storable::{Blob, Bound, Storable};
use shared::types::{
    custom_token::{ErcTokenId, SplTokenId},
    personal_note_share::MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES,
    tip::MAX_TIP_ID_BYTES,
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

/// A token id as a map key.
///
/// Stored as one byte for the token's kind (its `TokenId` discriminant), then its fields: a chain
/// id as 8 big-endian bytes, then an address as UTF-8 or a principal's bytes. A stable map reads
/// back every key it compares, so reading one has to be cheap: this is a byte copy, where the
/// Candid encoding these keys had before cost a full decode and address check per comparison.
/// No kind byte is `b'D'`, the first byte of every Candid encoding, which is how
/// `state::token_id_keys` tells the two apart.
///
/// Keys sort by `TokenId`, as they did in the Candid encoding.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredTokenId(pub TokenId);

impl StoredTokenId {
    fn encode(&self) -> Vec<u8> {
        let (kind, chain_id, fields): (u8, Option<u64>, &[u8]) = match &self.0 {
            TokenId::EvmNative(chain_id) => (0, Some(*chain_id), &[]),
            TokenId::Erc20(address, chain_id) => (1, Some(*chain_id), address.as_str().as_bytes()),
            TokenId::Erc721(address, chain_id) => (2, Some(*chain_id), address.as_str().as_bytes()),
            TokenId::Erc1155(address, chain_id) => {
                (3, Some(*chain_id), address.as_str().as_bytes())
            }
            TokenId::Erc4626(address, chain_id) => {
                (4, Some(*chain_id), address.as_str().as_bytes())
            }
            TokenId::Icrc(ledger_id) => (5, None, ledger_id.as_slice()),
            TokenId::IcpNative => (6, None, &[]),
            TokenId::SplMainnet(address) => (7, None, address.as_str().as_bytes()),
            TokenId::SplDevnet(address) => (8, None, address.as_str().as_bytes()),
            TokenId::SolNativeMainnet => (9, None, &[]),
            TokenId::SolNativeDevnet => (10, None, &[]),
            TokenId::BtcNativeMainnet => (11, None, &[]),
            TokenId::BtcNativeTestnet => (12, None, &[]),
            TokenId::ExtV2(canister_id) => (13, None, canister_id.as_slice()),
            TokenId::Dip721(canister_id) => (14, None, canister_id.as_slice()),
            TokenId::IcPunks(canister_id) => (15, None, canister_id.as_slice()),
            TokenId::Icrc7(canister_id) => (16, None, canister_id.as_slice()),
            TokenId::XrpNativeMainnet => (17, None, &[]),
        };

        let mut buf = Vec::with_capacity(1 + 8 + fields.len());
        buf.push(kind);
        if let Some(chain_id) = chain_id {
            buf.extend_from_slice(&chain_id.to_be_bytes());
        }
        buf.extend_from_slice(fields);
        buf
    }

    fn decode(bytes: &[u8]) -> TokenId {
        let (&kind, fields) = bytes
            .split_first()
            .expect("a stored token id should not be empty");
        let chain_id = || {
            u64::from_be_bytes(
                fields[..8]
                    .try_into()
                    .expect("a stored token id should hold an 8-byte chain id"),
            )
        };
        let address = |from: usize| {
            String::from_utf8(fields[from..].to_vec())
                .expect("a stored token address should be valid UTF-8")
        };
        let erc_address = || ErcTokenId(address(8));
        let principal = || Principal::from_slice(fields);

        match kind {
            0 => TokenId::EvmNative(chain_id()),
            1 => TokenId::Erc20(erc_address(), chain_id()),
            2 => TokenId::Erc721(erc_address(), chain_id()),
            3 => TokenId::Erc1155(erc_address(), chain_id()),
            4 => TokenId::Erc4626(erc_address(), chain_id()),
            5 => TokenId::Icrc(principal()),
            6 => TokenId::IcpNative,
            7 => TokenId::SplMainnet(SplTokenId(address(0))),
            8 => TokenId::SplDevnet(SplTokenId(address(0))),
            9 => TokenId::SolNativeMainnet,
            10 => TokenId::SolNativeDevnet,
            11 => TokenId::BtcNativeMainnet,
            12 => TokenId::BtcNativeTestnet,
            13 => TokenId::ExtV2(principal()),
            14 => TokenId::Dip721(principal()),
            15 => TokenId::IcPunks(principal()),
            16 => TokenId::Icrc7(principal()),
            17 => TokenId::XrpNativeMainnet,
            _ => panic!("a stored token id has an unknown kind: {kind}"),
        }
    }
}

impl Storable for StoredTokenId {
    // TokenId includes String, so treat it as unbounded.
    // The bounding is applied when a user saves a custom token.
    // TODO: add maximum size expectations or validation to ensure token IDs limits
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(self.encode())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.encode()
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(Self::decode(&bytes))
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

#[cfg(test)]
mod stored_token_id_tests {
    use std::borrow::Cow;

    use candid::{encode_one, Principal};
    use ic_stable_structures::{storable::Storable, DefaultMemoryImpl, StableBTreeMap};
    use pretty_assertions::assert_eq;
    use shared::types::{
        custom_token::{ErcTokenId, SplTokenId},
        token_id::TokenId,
    };

    use super::{StoredPrincipal, StoredTokenId, UserTransactionKey};

    const ERC_ADDRESS: &str = "0x0000000000000000000000000000000000000abc";
    const SPL_ADDRESS: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    /// One token id of every kind. The match stops compiling when a kind is added, so that the new
    /// kind gets a case here too.
    fn one_of_each_kind() -> Vec<TokenId> {
        let ledger = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let erc = || ErcTokenId(ERC_ADDRESS.to_string());
        let spl = || SplTokenId(SPL_ADDRESS.to_string());
        let all = vec![
            TokenId::EvmNative(u64::MAX),
            TokenId::Erc20(erc(), 1),
            TokenId::Erc721(erc(), 8453),
            TokenId::Erc1155(erc(), 137),
            TokenId::Erc4626(erc(), 56),
            TokenId::Icrc(ledger),
            TokenId::IcpNative,
            TokenId::SplMainnet(spl()),
            TokenId::SplDevnet(spl()),
            TokenId::SolNativeMainnet,
            TokenId::SolNativeDevnet,
            TokenId::BtcNativeMainnet,
            TokenId::BtcNativeTestnet,
            TokenId::ExtV2(ledger),
            TokenId::Dip721(ledger),
            TokenId::IcPunks(ledger),
            TokenId::Icrc7(Principal::from_slice(&[7; 29])),
            TokenId::XrpNativeMainnet,
        ];
        for token_id in &all {
            match token_id {
                TokenId::EvmNative(_)
                | TokenId::Erc20(..)
                | TokenId::Erc721(..)
                | TokenId::Erc1155(..)
                | TokenId::Erc4626(..)
                | TokenId::Icrc(_)
                | TokenId::IcpNative
                | TokenId::SplMainnet(_)
                | TokenId::SplDevnet(_)
                | TokenId::SolNativeMainnet
                | TokenId::SolNativeDevnet
                | TokenId::BtcNativeMainnet
                | TokenId::BtcNativeTestnet
                | TokenId::ExtV2(_)
                | TokenId::Dip721(_)
                | TokenId::IcPunks(_)
                | TokenId::Icrc7(_)
                | TokenId::XrpNativeMainnet => {}
            }
        }
        all
    }

    #[test]
    fn round_trips_every_token_kind() {
        for token_id in one_of_each_kind() {
            let bytes = StoredTokenId(token_id.clone()).into_bytes();

            assert_eq!(StoredTokenId::from_bytes(Cow::Owned(bytes)).0, token_id);
        }
    }

    #[test]
    fn gives_every_token_kind_its_own_first_byte() {
        let first_bytes: Vec<u8> = one_of_each_kind()
            .into_iter()
            .map(|token_id| StoredTokenId(token_id).to_bytes()[0])
            .collect();

        assert_eq!(first_bytes, (0..=17).collect::<Vec<u8>>());
    }

    #[test]
    fn never_starts_like_the_candid_encoding() {
        for token_id in one_of_each_kind() {
            assert!(encode_one(&token_id).unwrap().starts_with(b"DIDL"));
            assert!(!StoredTokenId(token_id).to_bytes().starts_with(b"D"));
        }
    }

    #[test]
    fn keeps_the_token_id_order_in_a_stable_map() {
        let mut map: StableBTreeMap<StoredTokenId, u64, _> =
            StableBTreeMap::init(DefaultMemoryImpl::default());
        let mut token_ids = one_of_each_kind();
        token_ids.push(TokenId::Erc20(ErcTokenId(ERC_ADDRESS.to_string()), 0));
        token_ids.push(TokenId::Erc20(
            ErcTokenId("0x0000000000000000000000000000000000000abd".to_string()),
            0,
        ));
        for token_id in token_ids.iter().rev() {
            map.insert(StoredTokenId(token_id.clone()), 0);
        }

        let in_map: Vec<TokenId> = map.keys().map(|key| key.0).collect();
        token_ids.sort();

        assert_eq!(in_map, token_ids);
    }

    #[test]
    fn round_trips_a_user_transaction_key() {
        let principal = StoredPrincipal(Principal::from_slice(&[3; 29]));
        for token_id in one_of_each_kind() {
            let key = UserTransactionKey(principal, StoredTokenId(token_id));
            let bytes = key.to_bytes().into_owned();

            assert_eq!(UserTransactionKey::from_bytes(Cow::Owned(bytes)), key);
        }
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
