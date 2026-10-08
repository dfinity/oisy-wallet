use candid::Principal;
use ic_canister_sig_creation::{
    delegation_signature_msg, CanisterSigPublicKey, DELEGATION_SIG_DOMAIN,
};
use ic_signature_verification::verify_canister_sig;
use shared::types::delegation::IIDelegationChain;

use crate::state::read_config;

/// Reads the II verification parameters (known II canister IDs, IC root key,
/// and whether the delegation guard is enabled) from the backend configuration.
///
/// The guard is enabled in **every** environment, including production. It was
/// historically disabled on production (`ecdsa_key_name == "key_1"`) because the
/// delegation-chain verification only looked up the legacy
/// `subnet/<subnet_id>/canister_ranges` certificate path, which mainnet no
/// longer serves on non-root subnets (it moved to the sharded
/// `canister_ranges/<subnet_id>` tree), producing `canister_ranges-entry not
/// found`. Now that `ic-signature-verification` handles the sharded path,
/// production enforces the same II delegation check as staging and local.
pub(crate) fn read_ii_verification_config() -> (Vec<Principal>, Vec<u8>, bool) {
    read_config(|config| {
        let ii_ids = config.ii_canister_id.map(|id| vec![id]).unwrap_or_default();
        let root_key = config
            .ic_root_key_raw
            .clone()
            .expect("IC root key not configured");
        let guard_enabled = true;
        (ii_ids, root_key, guard_enabled)
    })
}

/// Requires a valid II delegation chain for non-controller callers.
///
/// When `guard_enabled` is `false` the check is a no-op and `Ok(())` is
/// returned immediately. All environments (production, staging, local) pass
/// `true`; `false` is only used to exercise the disabled path in tests.
///
/// Controllers bypass the check entirely and `Ok(())` is returned regardless
/// of whether a chain is provided.  For all other callers the chain must be
/// present and pass full cryptographic verification via
/// [`verify_ii_delegation_chain`].
pub fn require_ii_delegation(
    chain: Option<&IIDelegationChain>,
    caller_is_controller: bool,
    caller: Principal,
    known_ii_canister_ids: &[Principal],
    ic_root_key_raw: &[u8],
    now_ns: u64,
    guard_enabled: bool,
) -> Result<(), String> {
    if !guard_enabled {
        return Ok(());
    }

    if caller_is_controller {
        return Ok(());
    }

    let chain = chain.ok_or_else(|| "II delegation chain is required".to_string())?;

    verify_ii_delegation_chain(
        chain,
        caller,
        known_ii_canister_ids,
        ic_root_key_raw,
        now_ns,
    )
}

/// Verifies the provided II delegation chain against the caller's principal.
///
/// II delegation chains always contain exactly one delegation with no targets.
///
/// Modeled after [`validate_delegation_and_get_principal`] from the Internet Identity
/// sig-verifier library.
///
/// [`validate_delegation_and_get_principal`]: https://github.com/dfinity/internet-identity/blob/3380aca8df9bb9552002222c8788b7c47c9e6008/src/sig-verifier-js/src/lib.rs#L42
pub fn verify_ii_delegation_chain(
    chain: &IIDelegationChain,
    caller: Principal,
    known_ii_canister_ids: &[Principal],
    ic_root_key_raw: &[u8],
    now_ns: u64,
) -> Result<(), String> {
    if chain.delegations.len() != 1 {
        return Err(format!(
            "expected exactly one delegation, got {}",
            chain.delegations.len()
        ));
    }

    let signed_del = &chain.delegations[0];

    if signed_del.delegation.targets.is_some() {
        return Err("delegation must not have targets set".to_string());
    }

    let derived_principal = Principal::self_authenticating(&chain.public_key);
    if derived_principal != caller {
        return Err(format!(
            "delegation chain public key does not match caller: derived={derived_principal}, caller={caller}"
        ));
    }

    let canister_sig_pk = CanisterSigPublicKey::try_from(chain.public_key.as_slice())
        .map_err(|e| format!("root public key is not a valid canister signature key: {e}"))?;

    if !known_ii_canister_ids.contains(&canister_sig_pk.canister_id) {
        return Err(format!(
            "delegation root key belongs to canister {} which is not a known II canister",
            canister_sig_pk.canister_id
        ));
    }

    if signed_del.delegation.expiration < now_ns {
        return Err(format!(
            "delegation expired at {} but current time is {now_ns}",
            signed_del.delegation.expiration
        ));
    }

    let delegation_hash = delegation_signature_msg(
        &signed_del.delegation.pubkey,
        signed_del.delegation.expiration,
        None,
    );

    #[expect(clippy::cast_possible_truncation)]
    let msg = {
        let mut buf = Vec::with_capacity(1 + DELEGATION_SIG_DOMAIN.len() + delegation_hash.len());
        buf.push(DELEGATION_SIG_DOMAIN.len() as u8);
        buf.extend_from_slice(DELEGATION_SIG_DOMAIN);
        buf.extend_from_slice(&delegation_hash);
        buf
    };

    verify_canister_sig(
        &msg,
        &signed_del.signature,
        &canister_sig_pk.to_der(),
        ic_root_key_raw,
    )
    .map_err(|e| format!("delegation signature verification failed: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use ic_canister_sig_creation::CanisterSigPublicKey;
    use shared::types::delegation::{Delegation, IIDelegationChain, SignedDelegation};

    use super::{require_ii_delegation, verify_ii_delegation_chain};

    const FAR_FUTURE_NS: u64 = 9_999_999_999_000_000_000;

    fn test_ii_canister_id() -> Principal {
        Principal::from_text("rwlgt-iiaaa-aaaaa-aaaaa-cai").unwrap()
    }

    fn make_canister_sig_public_key(canister_id: Principal) -> Vec<u8> {
        CanisterSigPublicKey::new(canister_id, b"test-seed".to_vec()).to_der()
    }

    fn make_chain(public_key: Vec<u8>, delegation: Delegation) -> IIDelegationChain {
        IIDelegationChain {
            public_key,
            delegations: vec![SignedDelegation {
                delegation,
                signature: vec![0u8; 32],
            }],
        }
    }

    fn valid_delegation(session_pubkey: &[u8]) -> Delegation {
        Delegation {
            pubkey: session_pubkey.to_vec(),
            expiration: FAR_FUTURE_NS,
            targets: None,
        }
    }

    // ---- require_ii_delegation ----

    #[test]
    fn test_require_controller_bypasses_without_chain() {
        let result = require_ii_delegation(None, true, Principal::anonymous(), &[], &[], 0, true);
        assert!(result.is_ok());
    }

    #[test]
    fn test_require_controller_bypasses_with_chain() {
        let pk = make_canister_sig_public_key(test_ii_canister_id());
        let chain = make_chain(pk, valid_delegation(b"session"));
        let result = require_ii_delegation(
            Some(&chain),
            true,
            Principal::anonymous(),
            &[],
            &[],
            0,
            true,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_require_non_controller_missing_chain_guard_enabled() {
        let result = require_ii_delegation(None, false, Principal::anonymous(), &[], &[], 0, true);
        assert_eq!(result.unwrap_err(), "II delegation chain is required");
    }

    #[test]
    fn test_require_non_controller_missing_chain_guard_disabled() {
        let result = require_ii_delegation(None, false, Principal::anonymous(), &[], &[], 0, false);
        assert!(result.is_ok());
    }

    // ---- verify_ii_delegation_chain ----

    #[test]
    fn test_verify_rejects_empty_delegations() {
        let chain = IIDelegationChain {
            public_key: vec![1, 2, 3],
            delegations: vec![],
        };
        let err =
            verify_ii_delegation_chain(&chain, Principal::anonymous(), &[], &[], 0).unwrap_err();
        assert!(err.contains("expected exactly one delegation, got 0"));
    }

    #[test]
    fn test_verify_rejects_multiple_delegations() {
        let del = SignedDelegation {
            delegation: valid_delegation(b"k"),
            signature: vec![],
        };
        let chain = IIDelegationChain {
            public_key: vec![1, 2, 3],
            delegations: vec![del.clone(), del],
        };
        let err =
            verify_ii_delegation_chain(&chain, Principal::anonymous(), &[], &[], 0).unwrap_err();
        assert!(err.contains("expected exactly one delegation, got 2"));
    }

    #[test]
    fn test_verify_rejects_delegation_with_targets() {
        let pk = make_canister_sig_public_key(test_ii_canister_id());
        let caller = Principal::self_authenticating(&pk);
        let mut delegation = valid_delegation(b"session");
        delegation.targets = Some(vec![Principal::anonymous()]);
        let chain = make_chain(pk, delegation);

        let err = verify_ii_delegation_chain(&chain, caller, &[test_ii_canister_id()], &[], 0)
            .unwrap_err();
        assert!(err.contains("delegation must not have targets set"));
    }

    #[test]
    fn test_verify_rejects_principal_mismatch() {
        let pk = make_canister_sig_public_key(test_ii_canister_id());
        let wrong_caller = Principal::self_authenticating(b"someone-else");
        let chain = make_chain(pk, valid_delegation(b"session"));

        let err =
            verify_ii_delegation_chain(&chain, wrong_caller, &[test_ii_canister_id()], &[], 0)
                .unwrap_err();
        assert!(err.contains("does not match caller"));
    }

    #[test]
    fn test_verify_rejects_unknown_ii_canister() {
        let unknown_canister = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        let pk = make_canister_sig_public_key(unknown_canister);
        let caller = Principal::self_authenticating(&pk);
        let chain = make_chain(pk, valid_delegation(b"session"));

        let err = verify_ii_delegation_chain(&chain, caller, &[test_ii_canister_id()], &[], 0)
            .unwrap_err();
        assert!(err.contains("not a known II canister"));
    }

    #[test]
    fn test_verify_rejects_expired_delegation() {
        let pk = make_canister_sig_public_key(test_ii_canister_id());
        let caller = Principal::self_authenticating(&pk);
        let mut delegation = valid_delegation(b"session");
        delegation.expiration = 1_000;
        let chain = make_chain(pk, delegation);

        let err = verify_ii_delegation_chain(&chain, caller, &[test_ii_canister_id()], &[], 2_000)
            .unwrap_err();
        assert!(err.contains("delegation expired"));
    }

    #[test]
    fn test_verify_rejects_invalid_public_key() {
        let bad_pk = vec![
            0x30, 0x20, 0x30, 0x0c, 0x06, 0x0a, 0x2b, 0x06, 0x01, 0x04, 0x01, 0x82, 0xdc, 0x7c,
            0x05, 0x01, 0x03, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x99,
        ];
        let caller = Principal::self_authenticating(&bad_pk);
        let chain = make_chain(bad_pk, valid_delegation(b"session"));

        let err = verify_ii_delegation_chain(&chain, caller, &[test_ii_canister_id()], &[], 0)
            .unwrap_err();
        assert!(err.contains("not a valid canister signature key"));
    }
}
