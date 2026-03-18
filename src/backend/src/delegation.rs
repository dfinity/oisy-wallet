use candid::Principal;
use ic_canister_sig_creation::{
    delegation_signature_msg, CanisterSigPublicKey, DELEGATION_SIG_DOMAIN,
};
use ic_signature_verification::verify_canister_sig;
use shared::types::delegation::IIDelegationChain;

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
