//! Personal notes: a per-user list of free-text notes, stored end-to-end
//! encrypted via the vetKeys `EncryptedMaps` library so the canister and node
//! providers only ever see ciphertext.
//!
//! Each user owns their own encrypted map (keyed by their principal); note
//! entries are keyed by an opaque, client-generated `note_id`. The cleartext
//! envelope is encrypted/decrypted entirely in the browser — see the frontend
//! crypto helper. This module only ever moves ciphertext in and out of storage
//! and exposes the vetKD derivation endpoints the browser needs to derive its
//! per-user key.

use ic_stable_structures::storable::Blob;

pub mod service;

/// Domain separator bound into the vetKD derivation for the personal-notes
/// store. Never change this for a deployed canister — it is part of the key
/// derivation, so changing it would orphan every existing ciphertext.
pub const PERSONAL_NOTES_DOMAIN_SEPARATOR: &str = "oisy_personal_notes";

/// Raw bytes of the single map name used for every user's personal-notes map.
/// Each user owns their own map under their own principal, so a constant name is
/// sufficient (notes are not namespaced further).
const PERSONAL_NOTES_MAP_NAME: &[u8] = b"personal_notes";

/// The fixed 32-byte map name. `EncryptedMaps` map names are `Blob<32>`; the
/// constant name is right-padded with zero bytes.
fn personal_notes_map_name() -> Blob<32> {
    let mut bytes = [0u8; 32];
    bytes[..PERSONAL_NOTES_MAP_NAME.len()].copy_from_slice(PERSONAL_NOTES_MAP_NAME);
    Blob::try_from(bytes.as_slice()).expect("a 32-byte array always fits a Blob<32>")
}
