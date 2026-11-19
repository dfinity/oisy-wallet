use std::{cell::RefCell, collections::BTreeMap};

use candid::Principal;
use ic_canister_sig_creation::{
    delegation_signature_msg, CanisterSigPublicKey, DELEGATION_SIG_DOMAIN,
};
use ic_signature_verification::verify_canister_sig;
use sha2::{Digest, Sha256};
use shared::types::delegation::IIDelegationChain;

use crate::state::read_config;

/// The most callers whose passed checks [`require_ii_delegation`] keeps at once. Sessions last an
/// hour, so a full cache first drops the expired entries, and starts over if that frees nothing:
/// the only cost is that the next checks pay their full price again.
const MAX_VERIFIED_CHAINS: usize = 100_000;

/// The most chains kept per caller. A user signed in on several devices or browsers at once has
/// one principal but a chain per session; with fewer slots than live sessions, their reads would
/// evict each other's chain and every one would pay the full check.
const MAX_VERIFIED_CHAINS_PER_CALLER: usize = 4;

/// A chain that passed [`verify_ii_delegation_chain`] for a caller.
struct VerifiedChain {
    /// [`verified_chain_digest`] of the chain and the II config it passed against.
    digest: [u8; 32],
    /// The delegation's expiration, after which the chain no longer passes.
    expiration_ns: u64,
}

thread_local! {
    /// The chains each caller passed [`require_ii_delegation`] with, up to
    /// [`MAX_VERIFIED_CHAINS_PER_CALLER`]. Verifying Internet Identity's canister signature costs
    /// about 1.15B cycles, far more than the calls it guards: a `btc_get_balance` costs the backend
    /// about 54M, and the wallet reads it every 30 seconds. A session sends the same chain on every
    /// call, so it pays for the signature once.
    ///
    /// Heap rather than stable memory on purpose: the II config only changes at install or
    /// upgrade, which clear it, and a cleared cache only costs each caller one check again.
    static VERIFIED_CHAINS: RefCell<BTreeMap<Principal, Vec<VerifiedChain>>> =
        const { RefCell::new(BTreeMap::new()) };
}

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
///
/// A chain that passed is remembered for its caller until it expires
/// (`VERIFIED_CHAINS`, a few chains per caller), so the same caller sending the
/// exact same chain again skips the signature check. Any other chain, or the
/// same one past its expiration, is verified in full.
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

    let digest = verified_chain_digest(chain, known_ii_canister_ids, ic_root_key_raw);

    if digest.is_some_and(|digest| is_verified(caller, &digest, now_ns)) {
        return Ok(());
    }

    verify_ii_delegation_chain(
        chain,
        caller,
        known_ii_canister_ids,
        ic_root_key_raw,
        now_ns,
    )?;

    // A chain that passed holds exactly one delegation.
    if let (Some(digest), [signed]) = (digest, chain.delegations.as_slice()) {
        remember_verified(caller, digest, signed.delegation.expiration, now_ns);
    }

    Ok(())
}

/// SHA-256 over everything the check depends on besides the caller and the time: the whole chain,
/// signature included, and the II config it is checked against. `None` if it cannot be encoded,
/// in which case the chain is verified in full.
fn verified_chain_digest(
    chain: &IIDelegationChain,
    known_ii_canister_ids: &[Principal],
    ic_root_key_raw: &[u8],
) -> Option<[u8; 32]> {
    let bytes = candid::encode_args((chain, known_ii_canister_ids, ic_root_key_raw)).ok()?;
    Some(Sha256::digest(bytes).into())
}

fn is_verified(caller: Principal, digest: &[u8; 32], now_ns: u64) -> bool {
    VERIFIED_CHAINS.with_borrow(|chains| {
        chains.get(&caller).is_some_and(|verified| {
            verified
                .iter()
                .any(|chain| chain.digest == *digest && chain.expiration_ns >= now_ns)
        })
    })
}

fn remember_verified(caller: Principal, digest: [u8; 32], expiration_ns: u64, now_ns: u64) {
    VERIFIED_CHAINS.with_borrow_mut(|chains| {
        if chains.len() >= MAX_VERIFIED_CHAINS && !chains.contains_key(&caller) {
            chains.retain(|_, verified| {
                verified.retain(|chain| chain.expiration_ns >= now_ns);
                !verified.is_empty()
            });

            if chains.len() >= MAX_VERIFIED_CHAINS {
                chains.clear();
            }
        }

        let verified = chains.entry(caller).or_default();

        verified.retain(|chain| chain.expiration_ns >= now_ns && chain.digest != digest);

        if verified.len() >= MAX_VERIFIED_CHAINS_PER_CALLER {
            if let Some(first_to_expire) = verified
                .iter()
                .enumerate()
                .min_by_key(|(_, chain)| chain.expiration_ns)
                .map(|(i, _)| i)
            {
                verified.swap_remove(first_to_expire);
            }
        }

        verified.push(VerifiedChain {
            digest,
            expiration_ns,
        });
    });
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

    use super::{
        is_verified, remember_verified, require_ii_delegation, verified_chain_digest,
        verify_ii_delegation_chain, MAX_VERIFIED_CHAINS, MAX_VERIFIED_CHAINS_PER_CALLER,
        VERIFIED_CHAINS,
    };

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

    // ---- the verified-chain cache ----

    #[test]
    fn test_require_skips_the_signature_of_a_remembered_chain_only() {
        // The chain's dummy signature never verifies, so it can only pass from the cache.
        let pk = make_canister_sig_public_key(test_ii_canister_id());
        let caller = Principal::self_authenticating(&pk);
        let chain = make_chain(pk, valid_delegation(b"session"));
        let ii_ids = [test_ii_canister_id()];
        let root_key: &[u8] = b"root-key";
        let require = |chain: &IIDelegationChain,
                       caller: Principal,
                       ii_ids: &[Principal],
                       root_key: &[u8],
                       now_ns: u64| {
            require_ii_delegation(Some(chain), false, caller, ii_ids, root_key, now_ns, true)
        };

        assert!(require(&chain, caller, &ii_ids, root_key, 0).is_err());

        let digest = verified_chain_digest(&chain, &ii_ids, root_key).unwrap();
        remember_verified(caller, digest, FAR_FUTURE_NS, 0);

        assert!(require(&chain, caller, &ii_ids, root_key, 0).is_ok());
        assert!(require(&chain, caller, &ii_ids, root_key, FAR_FUTURE_NS).is_ok());

        // Past its expiration, from another caller, against another config, or changed in any
        // way, the chain is verified in full again.
        assert!(require(&chain, caller, &ii_ids, root_key, FAR_FUTURE_NS + 1).is_err());
        assert!(require(&chain, Principal::anonymous(), &ii_ids, root_key, 0).is_err());
        assert!(require(&chain, caller, &[], root_key, 0).is_err());
        assert!(require(&chain, caller, &ii_ids, b"another-root-key", 0).is_err());

        let mut other_signature = chain.clone();
        other_signature.delegations[0].signature = vec![1u8; 32];
        assert!(require(&other_signature, caller, &ii_ids, root_key, 0).is_err());

        let mut with_targets = chain.clone();
        with_targets.delegations[0].delegation.targets = Some(vec![Principal::anonymous()]);
        assert!(require(&with_targets, caller, &ii_ids, root_key, 0).is_err());
    }

    #[test]
    fn test_cache_keeps_a_few_chains_per_caller() {
        let caller = Principal::self_authenticating(b"caller");
        let kept = || VERIFIED_CHAINS.with_borrow(|chains| chains.get(&caller).map_or(0, Vec::len));

        // A session per device, each expiring at a different time.
        for (digest, expiration_ns) in [(1, 400), (2, 100), (3, 300), (4, 200)] {
            remember_verified(caller, [digest; 32], expiration_ns, 0);
        }

        assert_eq!(kept(), MAX_VERIFIED_CHAINS_PER_CALLER);
        for digest in 1..=4 {
            assert!(is_verified(caller, &[digest; 32], 0));
        }

        // One more drops the chain that expires first.
        remember_verified(caller, [5; 32], 500, 0);

        assert_eq!(kept(), MAX_VERIFIED_CHAINS_PER_CALLER);
        assert!(!is_verified(caller, &[2; 32], 0));
        for digest in [1, 3, 4, 5] {
            assert!(is_verified(caller, &[digest; 32], 0));
        }

        // The expired ones go when another chain passes, and a chain is never kept twice.
        remember_verified(caller, [6; 32], 600, 350);
        remember_verified(caller, [6; 32], 600, 350);

        assert_eq!(kept(), 3);
        for digest in [1, 5, 6] {
            assert!(is_verified(caller, &[digest; 32], 350));
        }
        assert_eq!(
            VERIFIED_CHAINS.with_borrow(std::collections::BTreeMap::len),
            1
        );
    }

    #[test]
    fn test_full_cache_drops_expired_chains_then_starts_over() {
        let caller = |i: usize| Principal::from_slice(&i.to_be_bytes());

        // The first entry expires at 10, the others never do.
        for i in 0..MAX_VERIFIED_CHAINS {
            let expiration_ns = if i == 0 { 10 } else { FAR_FUTURE_NS };
            remember_verified(caller(i), [0; 32], expiration_ns, 0);
        }

        let newcomer = caller(MAX_VERIFIED_CHAINS);
        remember_verified(newcomer, [0; 32], FAR_FUTURE_NS, 20);

        assert_eq!(
            VERIFIED_CHAINS.with_borrow(std::collections::BTreeMap::len),
            MAX_VERIFIED_CHAINS
        );
        assert!(!is_verified(caller(0), &[0; 32], 0));
        assert!(is_verified(newcomer, &[0; 32], 20));

        // Nothing left to drop: it starts over with the next newcomer.
        let next = caller(MAX_VERIFIED_CHAINS + 1);
        remember_verified(next, [0; 32], FAR_FUTURE_NS, 20);

        assert_eq!(
            VERIFIED_CHAINS.with_borrow(std::collections::BTreeMap::len),
            1
        );
        assert!(is_verified(next, &[0; 32], 20));

        // A caller already in a full cache only adds to its own entry.
        for i in 0..MAX_VERIFIED_CHAINS - 1 {
            remember_verified(caller(i), [0; 32], FAR_FUTURE_NS, 20);
        }
        remember_verified(next, [3; 32], FAR_FUTURE_NS, 20);

        assert_eq!(
            VERIFIED_CHAINS.with_borrow(std::collections::BTreeMap::len),
            MAX_VERIFIED_CHAINS
        );
        assert!(is_verified(next, &[0; 32], 20));
        assert!(is_verified(next, &[3; 32], 20));
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
