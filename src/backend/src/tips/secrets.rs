//! Per-tip claim-code recovery, stored end-to-end encrypted.
//!
//! The claim code is generated in the browser and only its hash reaches this
//! canister, which is what keeps a tip link unforgeable — and also what made a
//! link unrecoverable once the sender closed the share screen. This module gives
//! the sender a way back to it without weakening that: the browser encrypts the
//! code under a vetKey only that principal can derive, and stores the
//! ciphertext here. The canister moves opaque bytes and can no more read a
//! claim code than before.
//!
//! Deliberately a second `EncryptedMaps` rather than a field on `TipRecord`.
//! `EncryptedMaps` is what enforces that a map belongs to one principal, so
//! reusing it means the "only the sender can read their own codes" property is
//! the library's job and not ours. Mirrors `personal_notes`.

use std::cell::RefCell;

use candid::Principal;
use ic_cdk::api::msg_caller;
use ic_stable_structures::storable::Blob;
use ic_vetkeys::types::ByteBuf as VetkeysByteBuf;
use serde_bytes::ByteBuf;
use shared::types::tip::{SetTipSecretRequest, TipError, MAX_TIP_SECRET_CIPHERTEXT_BYTES};

use crate::{
    state::{with_existing_tip_secrets_mut, with_tip_secrets, with_tip_secrets_mut},
    tips::model::validate_tip_id,
};

/// Domain separator bound into the vetKD derivation for the tip-secrets store.
/// Never change this for a deployed canister — it is part of the key derivation,
/// so changing it would orphan every stored ciphertext, and with it every
/// sender's ability to recover their own links.
pub const TIP_SECRETS_DOMAIN_SEPARATOR: &str = "oisy_tip_secrets";

/// Raw bytes of the single map name used for every user's tip-secrets map. Each
/// user owns their own map under their own principal, so a constant name is
/// enough. Distinct from the personal-notes name on purpose: the two stores
/// derive different keys, so a fault or a rotation in one cannot reach the other.
const TIP_SECRETS_MAP_NAME: &[u8] = b"tip_secrets";

/// The fixed 32-byte map name. `EncryptedMaps` map names are `Blob<32>`; the
/// constant name is right-padded with zero bytes.
pub fn tip_secrets_map_name() -> Blob<32> {
    let mut bytes = [0u8; 32];
    bytes[..TIP_SECRETS_MAP_NAME.len()].copy_from_slice(TIP_SECRETS_MAP_NAME);
    Blob::try_from(bytes.as_slice()).expect("a 32-byte array always fits a Blob<32>")
}

/// `EncryptedMaps` identifies each map by `(owner, map_name)`. The owner is the
/// caller, so a sender automatically owns their own tip-secrets map and no
/// caller can reach another principal's.
type KeyId = (Principal, Blob<32>);

fn caller_key_id() -> KeyId {
    (msg_caller(), tip_secrets_map_name())
}

/// Wraps an `EncryptedMaps` (`String`) error. The message never carries a claim
/// code — the canister cannot read one.
fn internal(msg: String) -> TipError {
    TipError::InternalError { msg }
}

/// Takes the id by value so the exported endpoints can move it straight
/// through: a candid method must accept an owned `String`, and clippy's
/// `needless_pass_by_value` is satisfied only if something downstream consumes
/// it. `service::cancel_tip` moves its id into `TipId` for the same reason.
fn tip_id_to_map_key(tip_id: String) -> Result<Blob<32>, TipError> {
    // Through the canonical validator rather than a length check of its own.
    // The bound was the same, but an empty id passed — and an empty id is a key
    // no tip can ever match, so the entry under it would outlive every cleanup
    // path (claim, cancel and prune all remove by tip id).
    validate_tip_id(&tip_id)?;
    Blob::try_from(tip_id.into_bytes().as_slice()).map_err(|_| TipError::InvalidTipId)
}

/// Stores the encrypted claim code for one of the caller's tips.
///
/// Not gated on the tip existing: the browser writes this immediately after a
/// successful `create_tip`, and a stray entry for a tip that never materialised
/// is a few opaque bytes in the caller's own map, cleaned up with the tip.
pub fn set_tip_secret(request: SetTipSecretRequest) -> Result<(), TipError> {
    if request.encrypted_claim_code.len() > MAX_TIP_SECRET_CIPHERTEXT_BYTES {
        return Err(TipError::SecretCiphertextTooLarge);
    }

    let map_key = tip_id_to_map_key(request.tip_id)?;
    let key_id = caller_key_id();
    let caller = key_id.0;

    with_tip_secrets_mut(|encrypted_maps| {
        encrypted_maps
            .insert_encrypted_value(
                caller,
                key_id,
                map_key,
                VetkeysByteBuf::from(request.encrypted_claim_code.into_vec()),
            )
            .map_err(internal)?;
        Ok(())
    })
}

/// The encrypted claim code for one of the caller's tips, if one was stored.
/// `None` for a tip created before this store existed, or one whose secret has
/// been dropped — the caller cannot tell those apart, and neither case is an
/// error.
pub fn get_tip_secret(tip_id: String) -> Result<Option<ByteBuf>, TipError> {
    let map_key = tip_id_to_map_key(tip_id)?;
    let key_id = caller_key_id();
    let caller = key_id.0;

    with_tip_secrets(|encrypted_maps| {
        let value = encrypted_maps
            .get_encrypted_value(caller, key_id, map_key)
            .map_err(internal)?;
        Ok(value.map(|bytes| ByteBuf::from(Vec::<u8>::from(bytes))))
    })
}

/// Drops the stored code for a tip, addressed by its **owner** rather than by
/// whoever is calling.
///
/// Called when a tip reaches a state where the link is worthless — cancelled,
/// claimed, or swept after its retention window — so a recoverable secret does
/// not outlive its usefulness.
///
/// Takes the owner explicitly because two of those three callers are not the
/// sender: a claim runs as the recipient, and the retention sweep runs as the
/// canister on a timer. `EncryptedMaps` checks writes with
/// `ensure_user_can_write(caller, key_id)`, which an owner satisfies implicitly,
/// so passing the owner as both is what lets those paths clean up at all. The
/// earlier caller-scoped version is why nothing but an explicit cancel ever
/// released a secret.
///
/// Never initialises the store — see [`with_existing_tip_secrets_mut`]. A
/// canister with no stored codes has nothing to clean up, and `Ok(())` is the
/// honest answer rather than a reason to allocate its memory.
pub fn remove_tip_secret_for(owner: Principal, tip_id: String) -> Result<(), TipError> {
    let map_key = tip_id_to_map_key(tip_id)?;
    let key_id = (owner, tip_secrets_map_name());

    with_existing_tip_secrets_mut(|encrypted_maps| {
        encrypted_maps
            .remove_encrypted_value(owner, key_id, map_key)
            .map_err(internal)
            .map(|_| ())
    })
    .unwrap_or(Ok(()))
}

/// Derives the caller's encrypted vetKey for the tip-secrets store, secured to
/// the browser-supplied transport public key. The browser decrypts it with the
/// transport secret key and derives the per-user symmetric key; only the caller
/// can obtain their own.
pub async fn get_encrypted_vetkey(transport_key: ByteBuf) -> Result<ByteBuf, TipError> {
    let key_id = caller_key_id();
    let caller = key_id.0;
    // The future is `'static` (it clones what it needs), so it is awaited after
    // the state borrow is released.
    let future = with_tip_secrets(|encrypted_maps| {
        encrypted_maps
            .get_encrypted_vetkey(
                caller,
                key_id,
                VetkeysByteBuf::from(transport_key.into_vec()),
            )
            .map_err(internal)
    })?;
    let vetkey = future.await;
    Ok(ByteBuf::from(Vec::<u8>::from(vetkey)))
}

thread_local! {
    /// The verification key, once fetched.
    ///
    /// It is a property of this canister's key name, the domain separator and
    /// the map name — none of which depend on the caller and none of which
    /// change — so fetching it more than once per canister lifetime is pure
    /// waste. Heap rather than stable memory on purpose: it is derivable, so
    /// re-fetching once after an upgrade costs one call and needs no migration.
    static VETKEY_PUBLIC_KEY: RefCell<Option<Vec<u8>>> = const { RefCell::new(None) };
}

/// The vetKey verification (public) key for the tip-secrets store, which the
/// browser needs to verify the derived vetKey. The same for every user, so it is
/// fetched once and cached.
pub async fn get_vetkey_public_key() -> Result<ByteBuf, TipError> {
    if let Some(cached) = VETKEY_PUBLIC_KEY.with_borrow(Clone::clone) {
        return Ok(ByteBuf::from(cached));
    }

    let future =
        with_tip_secrets(|encrypted_maps| Ok(encrypted_maps.get_vetkey_verification_key()))?;
    let verification_key = Vec::<u8>::from(future.await);

    // Two callers racing the first fetch both write the same bytes, so last
    // write wins is not a race worth guarding.
    VETKEY_PUBLIC_KEY.set(Some(verification_key.clone()));

    Ok(ByteBuf::from(verification_key))
}
