//! Sharing a personal note via a link: an independent, per-share
//! AES-GCM-encrypted blob whose key lives only in the link fragment, stored
//! opaquely in a publicly-readable, token-keyed store. Distinct from the
//! per-user vetKeys `EncryptedMaps` store in [`super::service`] — a share
//! never touches a user's vetKD key. See
//! `docs/ai/spec-driven-development/specs/2026-06-30-feat-share-personal-note.md`.

pub mod model;
pub mod service;
