use candid::Principal;
use ic_canister_sig_creation::{
    delegation_signature_msg, CanisterSigPublicKey, DELEGATION_SIG_DOMAIN,
};
use ic_signature_verification::verify_canister_sig;
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
/// 7. Each delegation signature is cryptographically valid. The first delegation is verified as an
///    IC canister signature against the IC root key; subsequent delegations are verified against
///    the session key from the preceding delegation.
pub fn verify_ii_delegation_chain(
    chain: &IIDelegationChain,
    caller: Principal,
    known_ii_canister_ids: &[Principal],
    ic_root_key_raw: &[u8],
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

    let canister_sig_pk = CanisterSigPublicKey::try_from(chain.public_key.as_slice())
        .map_err(|e| format!("root public key is not a valid canister signature key: {e}"))?;

    if !known_ii_canister_ids.contains(&canister_sig_pk.canister_id) {
        return Err(format!(
            "delegation root key belongs to canister {} which is not a known II canister",
            canister_sig_pk.canister_id
        ));
    }

    let mut signing_key = chain.public_key.clone();

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

        let targets_as_bytes: Option<Vec<Vec<u8>>> = signed_del
            .delegation
            .targets
            .as_ref()
            .map(|targets| targets.iter().map(|p| p.as_slice().to_vec()).collect());

        let delegation_hash = delegation_signature_msg(
            &signed_del.delegation.pubkey,
            signed_del.delegation.expiration,
            targets_as_bytes.as_ref(),
        );

        // Build the raw domain-separated message: [len(domain)] || domain || hash.
        // verify_canister_sig will SHA256 this internally to look up in the signature tree,
        // matching what II stored via hash_with_domain(DELEGATION_SIG_DOMAIN, delegation_hash).
        let mut msg = Vec::with_capacity(1 + DELEGATION_SIG_DOMAIN.len() + delegation_hash.len());
        #[allow(clippy::cast_possible_truncation)]
        msg.push(DELEGATION_SIG_DOMAIN.len() as u8);
        msg.extend_from_slice(DELEGATION_SIG_DOMAIN);
        msg.extend_from_slice(&delegation_hash);

        verify_canister_sig(&msg, &signed_del.signature, &signing_key, ic_root_key_raw)
            .map_err(|e| format!("delegation signature verification failed: {e}"))?;

        signing_key.clone_from(&signed_del.delegation.pubkey);
    }

    Ok(())
}
