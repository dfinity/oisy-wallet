use candid::Principal;
use ic_canister_sig_creation::CanisterSigPublicKey;
use shared::types::delegation::IIDelegationChain;

/// Verifies the provided II delegation chain against the caller's principal.
///
/// Checks performed:
/// 1. The delegation chain is non-empty.
/// 2. The self-authenticating principal derived from the chain's root public key matches the
///    caller.
/// 3. None of the delegations in the chain have expired.
/// 4. The root public key is a valid IC canister signature key (proving the caller authenticated
///    through a canister, not a raw key pair).
/// 5. The canister ID embedded in the public key matches a known II canister ID.
/// 6. If targets are specified in any delegation, the current canister is included.
pub fn verify_ii_delegation_chain(
    chain: &IIDelegationChain,
    caller: Principal,
    known_ii_canister_ids: &[Principal],
    now_ns: u64,
) -> Result<(), String> {
    if chain.delegations.is_empty() {
        return Err("delegation chain is empty".to_string());
    }

    let derived_principal = Principal::self_authenticating(&chain.public_key);
    if derived_principal != caller {
        return Err(format!(
            "delegation chain public key does not match caller: derived={derived_principal}, caller={caller}"
        ));
    }

    for signed_del in &chain.delegations {
        if signed_del.delegation.expiration < now_ns {
            return Err(format!(
                "delegation expired at {} but current time is {now_ns}",
                signed_del.delegation.expiration
            ));
        }

        if let Some(targets) = &signed_del.delegation.targets {
            let own_canister_id = ic_cdk::id();
            if !targets.contains(&own_canister_id) {
                return Err(format!(
                    "delegation targets do not include this canister ({own_canister_id})"
                ));
            }
        }
    }

    let canister_sig_pk = CanisterSigPublicKey::try_from(chain.public_key.as_slice())
        .map_err(|e| format!("root public key is not a valid canister signature key: {e}"))?;

    if !known_ii_canister_ids.contains(&canister_sig_pk.canister_id) {
        return Err(format!(
            "delegation root key belongs to canister {} which is not a known II canister",
            canister_sig_pk.canister_id
        ));
    }

    Ok(())
}
