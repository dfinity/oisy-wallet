use std::collections::HashSet;

use candid::{Nat, Principal};
use shared::types::{
    active_user_transaction::{
        ActiveUserTransaction, ActiveUserTransactionData, ActiveUserTransactionError,
        ActiveUserTransactionRef, ActiveUserTransactionStatus, ChainFusionData,
        ChainFusionDirection, CreateActiveUserTransactionRequest, CyclesMintData,
        GetActiveUserTransactionsResponse, NearIntentsData, OisyTradeData,
        UpdateActiveUserTransactionRequest, XrpData, MAX_ACTIVE_USER_TRANSACTIONS_PER_USER,
        MAX_ACTIVE_USER_TRANSACTION_AMOUNT_BITS, MAX_ACTIVE_USER_TRANSACTION_ERROR_LEN,
        MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REFS,
        MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_KEY_LEN,
        MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_VALUE_LEN, MAX_ACTIVE_USER_TRANSACTION_ID_LEN,
        MAX_ACTIVE_USER_TRANSACTION_PROGRESS_STEP_LEN, MAX_EVM_ADDRESS_LEN,
        MAX_LIQUIDIUM_POOL_ID_LEN, MAX_XRP_ADDRESS_LEN, MIN_XRP_ADDRESS_LEN,
        XRP_REF_LAST_LEDGER_SEQUENCE, XRP_REF_TX_HASH, XRP_TX_HASH_LEN,
    },
    token_id::TokenId,
};

use crate::{
    signer::{CYCLES_LEDGER, ICP_LEDGER},
    types::{ActiveUserTransactionKey, ActiveUserTransactionsMap, Candid, StoredPrincipal},
};

/// Create a new active transaction. Checks are ordered so callers always see
/// the most informative error: `InvalidId` → `AlreadyExists` (idempotent
/// retries land here even at the cap) → `InvalidData` → `AlreadyInFlight` →
/// `TooManyActiveTransactions`. `AlreadyInFlight` precedes the cap because it
/// names the specific reason this create is refused and tells the caller what to
/// wait for, where the cap only says the store is full.
pub fn create(
    map: &mut ActiveUserTransactionsMap,
    principal: Principal,
    request: CreateActiveUserTransactionRequest,
    now_ns: u64,
) -> Result<ActiveUserTransaction, ActiveUserTransactionError> {
    validate_id(&request.id)?;

    let key = key(principal, &request.id);
    if map.contains_key(&key) {
        return Err(ActiveUserTransactionError::AlreadyExists);
    }

    validate_data(&request.data)?;
    validate_progress_step(request.progress_step.as_deref())?;
    validate_external_refs(&request.external_refs)?;

    if let Some(source_address) = xrp_payment_source(&request.data) {
        // Required here and not only in `validate_data`, which cannot see the
        // refs: both values are derived from the signed blob before this call, so
        // a row arriving without them describes a payment nothing could ever poll.
        require_xrp_refs(&request.external_refs)?;

        // An XRPL `Sequence` is a nonce, so at most one unresolved payment may
        // exist per source address — whether a send or a swap's deposit makes it.
        // The frontend refuses early too, but that check cannot be atomic with this
        // create — between the two it reads the account, derives a signing key and
        // takes a threshold signature, and a second tab can pass its own check
        // inside that window. This call is the only place that sees the check and
        // the write at once, so this is what actually holds the invariant.
        if has_xrp_payment_in_flight(map, principal, source_address) {
            return Err(ActiveUserTransactionError::AlreadyInFlight);
        }
    }

    if count_records(map, principal) >= MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
        return Err(ActiveUserTransactionError::TooManyActiveTransactions);
    }

    let tx = ActiveUserTransaction {
        id: request.id,
        status: ActiveUserTransactionStatus::Pending,
        data: request.data,
        progress_step: request.progress_step,
        external_refs: request.external_refs,
        created_at_ns: now_ns,
        updated_at_ns: now_ns,
        error: None,
    };

    map.insert(key, Candid(tx.clone()));
    Ok(tx)
}

/// Apply a partial update to an existing active transaction. Status transitions
/// are validated; updates against missing or other-user records are rejected.
pub fn update(
    map: &mut ActiveUserTransactionsMap,
    principal: Principal,
    request: UpdateActiveUserTransactionRequest,
    now_ns: u64,
) -> Result<ActiveUserTransaction, ActiveUserTransactionError> {
    validate_id(&request.id)?;

    let entry_key = key(principal, &request.id);
    let mut current = map
        .get(&entry_key)
        .map(|c| c.0)
        .ok_or(ActiveUserTransactionError::NotFound)?;

    if let Some(step) = request.progress_step.as_deref() {
        validate_progress_step(Some(step))?;
    }
    if let Some(refs) = request.external_refs.as_ref() {
        validate_external_refs(refs)?;

        // `external_refs` is replaced wholesale, so without this an update could
        // strip the poll keys off a row that is already refusing payments — the
        // same unresolvable state `create` now rejects, reached one call later.
        // Held for terminal rows too: the invariant is the record's, not a phase's.
        if xrp_payment_source(&current.data).is_some() {
            require_xrp_refs(refs)?;
        }
    }
    if let Some(err) = request.error.as_deref() {
        validate_error(err)?;
    }

    if let Some(new_status) = request.status.as_ref() {
        validate_transition(&current.status, new_status)?;
        current.status = new_status.clone();
    }
    if let Some(step) = request.progress_step {
        current.progress_step = Some(step);
    }
    if let Some(refs) = request.external_refs {
        current.external_refs = refs;
    }
    if let Some(err) = request.error {
        current.error = Some(err);
    }
    current.updated_at_ns = now_ns;

    map.insert(entry_key, Candid(current.clone()));
    Ok(current)
}

/// Delete an active transaction. Idempotent — returns `Ok(())` whether or not
/// the record existed (the FE only cares that it is gone).
pub fn delete(
    map: &mut ActiveUserTransactionsMap,
    principal: Principal,
    id: String,
) -> Result<(), ActiveUserTransactionError> {
    validate_id(&id)?;
    map.remove(&ActiveUserTransactionKey(StoredPrincipal(principal), id));
    Ok(())
}

/// Build the response of active transactions visible to the caller. Records
/// are never auto-pruned — the FE deletes them on user acknowledgement.
pub fn list(
    map: &ActiveUserTransactionsMap,
    principal: Principal,
) -> GetActiveUserTransactionsResponse {
    let transactions: Vec<ActiveUserTransaction> =
        scan_principal(map, principal).map(|(_, c)| c.0).collect();

    GetActiveUserTransactionsResponse { transactions }
}

/// Whether an XRP payment from this source address can still apply.
///
/// Per **address**, not per user: a record for a different address says nothing
/// about this one's sequence, and refusing on it would block an unrelated payment.
/// Compared raw, like everywhere else this address travels — a classic address is
/// base58 over a checksummed payload, so case is significant.
fn has_xrp_payment_in_flight(
    map: &ActiveUserTransactionsMap,
    principal: Principal,
    source_address: &str,
) -> bool {
    scan_principal(map, principal).any(|(_, Candid(tx))| {
        xrp_payment_source(&tx.data) == Some(source_address) && holds_xrp_address(&tx)
    })
}

/// The XRP address a row's payment is sent from, for the rows that make one: an
/// XRP send, and a swap whose deposit is an XRP payment. With
/// `holds_xrp_address`, the one place that knows which rows those are — a new
/// kind of row that makes an XRP payment is added here and nowhere else.
fn xrp_payment_source(data: &ActiveUserTransactionData) -> Option<&str> {
    match data {
        ActiveUserTransactionData::Xrp(d) => Some(&d.source_address),
        ActiveUserTransactionData::NearIntents(d) => d.source_address.as_deref(),
        _ => None,
    }
}

/// Whether a row's XRP payment can still apply. A send's can until the row is
/// terminal. A swap's deposit can only while the row is `Pending`: once the
/// deposit validates, the frontend moves the row to `Executing`, and the swap
/// goes on at 1Click without holding the address.
fn holds_xrp_address(tx: &ActiveUserTransaction) -> bool {
    match tx.data {
        ActiveUserTransactionData::Xrp(_) => matches!(
            tx.status,
            ActiveUserTransactionStatus::Pending | ActiveUserTransactionStatus::Executing
        ),
        ActiveUserTransactionData::NearIntents(_) => {
            matches!(tx.status, ActiveUserTransactionStatus::Pending)
        }
        _ => false,
    }
}

fn count_records(map: &ActiveUserTransactionsMap, principal: Principal) -> usize {
    let lower = key(principal, "");
    map.range(lower..)
        .take_while(|entry| entry.key().0 .0 == principal)
        .count()
}

fn scan_principal(
    map: &ActiveUserTransactionsMap,
    principal: Principal,
) -> impl Iterator<Item = (ActiveUserTransactionKey, Candid<ActiveUserTransaction>)> + '_ {
    let lower = key(principal, "");
    // `LazyEntry::into_pair` would let us replace the closure with a method
    // reference, but `ic_stable_structures::btreemap::iter` is a private module
    // so the type cannot be named outside the crate.
    #[expect(
        clippy::redundant_closure_for_method_calls,
        reason = "LazyEntry type path is not publicly exported by ic-stable-structures"
    )]
    map.range(lower..)
        .take_while(move |entry| entry.key().0 .0 == principal)
        .map(|entry| entry.into_pair())
}

fn key(principal: Principal, id: &str) -> ActiveUserTransactionKey {
    ActiveUserTransactionKey(StoredPrincipal(principal), id.to_string())
}

fn validate_id(id: &str) -> Result<(), ActiveUserTransactionError> {
    if id.is_empty() || id.len() > MAX_ACTIVE_USER_TRANSACTION_ID_LEN {
        return Err(ActiveUserTransactionError::InvalidId);
    }
    if !id.chars().all(|c| c.is_ascii_graphic()) {
        return Err(ActiveUserTransactionError::InvalidId);
    }
    Ok(())
}

fn validate_progress_step(step: Option<&str>) -> Result<(), ActiveUserTransactionError> {
    if let Some(s) = step {
        if s.len() > MAX_ACTIVE_USER_TRANSACTION_PROGRESS_STEP_LEN {
            return Err(ActiveUserTransactionError::InvalidData(
                "progress_step too long".to_string(),
            ));
        }
    }
    Ok(())
}

fn validate_error(error: &str) -> Result<(), ActiveUserTransactionError> {
    if error.len() > MAX_ACTIVE_USER_TRANSACTION_ERROR_LEN {
        return Err(ActiveUserTransactionError::InvalidData(
            "error message too long".to_string(),
        ));
    }
    Ok(())
}

fn validate_external_refs(
    refs: &[ActiveUserTransactionRef],
) -> Result<(), ActiveUserTransactionError> {
    if refs.len() > MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REFS {
        return Err(ActiveUserTransactionError::InvalidData(
            "too many external_refs".to_string(),
        ));
    }
    let mut seen = HashSet::with_capacity(refs.len());
    for ActiveUserTransactionRef { key, value } in refs {
        if key.is_empty() || key.len() > MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_KEY_LEN {
            return Err(ActiveUserTransactionError::InvalidData(
                "external_refs key invalid length".to_string(),
            ));
        }
        if value.len() > MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_VALUE_LEN {
            return Err(ActiveUserTransactionError::InvalidData(
                "external_refs value too long".to_string(),
            ));
        }
        if !seen.insert(key.as_str()) {
            return Err(ActiveUserTransactionError::InvalidData(
                "duplicate external_refs key".to_string(),
            ));
        }
    }
    Ok(())
}

fn validate_data(data: &ActiveUserTransactionData) -> Result<(), ActiveUserTransactionError> {
    match data {
        ActiveUserTransactionData::OneSecIcpToEvm(d) => {
            require_valid_amount(&d.amount, "amount")?;
            require_evm_address(&d.recipient_evm_address)?;
        }
        ActiveUserTransactionData::OneSecEvmToIcp(d) => {
            require_valid_amount(&d.amount, "amount")?;
            if d.recipient_principal == Principal::anonymous() {
                return Err(ActiveUserTransactionError::InvalidData(
                    "recipient_principal must not be anonymous".to_string(),
                ));
            }
        }
        ActiveUserTransactionData::Liquidium(d) => {
            require_valid_amount(&d.amount, "amount")?;
            require_pool_id(&d.pool_id)?;
        }
        ActiveUserTransactionData::NearIntents(d) => {
            require_valid_amount(&d.amount, "amount")?;
            require_near_intents_source_address(d)?;
        }
        ActiveUserTransactionData::Velora(d) => {
            require_valid_amount(&d.amount, "amount")?;
        }
        ActiveUserTransactionData::ChainFusion(d) => {
            require_valid_amount(&d.amount, "amount")?;
            require_chain_fusion_pair(d)?;
        }
        ActiveUserTransactionData::CyclesMint(d) => {
            require_valid_amount(&d.amount, "amount")?;
            require_cycles_mint_pair(d)?;
        }
        ActiveUserTransactionData::OisyTrade(d) => {
            require_valid_amount(&d.amount, "amount")?;
            require_oisy_trade_pair(d)?;
        }
        ActiveUserTransactionData::Xrp(d) => {
            require_valid_amount(&d.amount, "amount")?;
            require_valid_amount(&d.fee, "fee")?;
            require_xrp_token(&d.token)?;
            require_xrp_address(&d.source_address, "source_address")?;
            require_xrp_address(&d.destination_address, "destination_address")?;
            require_distinct_xrp_accounts(d)?;
        }
    }
    Ok(())
}

/// An amount is a base-unit balance, so it is positive and fits the widest
/// integer any supported chain uses. The upper bound is what makes the encoded
/// size of a record provable: `Nat` is variable-length, so an unbounded amount
/// would let a single record carry megabytes into permanent stable memory.
///
/// `field` is named rather than assumed because a payload can carry more than
/// one such value — an XRP row validates its transaction cost here too, and
/// reporting that as an `amount` problem sends the reader to the wrong field.
fn require_valid_amount(amount: &Nat, field: &str) -> Result<(), ActiveUserTransactionError> {
    if amount.0 == 0u32.into() {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{field} must be greater than zero"
        )));
    }
    if amount.0.bits() > MAX_ACTIVE_USER_TRANSACTION_AMOUNT_BITS {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{field} is too large"
        )));
    }
    Ok(())
}

fn require_pool_id(pool_id: &str) -> Result<(), ActiveUserTransactionError> {
    if pool_id.is_empty() || pool_id.len() > MAX_LIQUIDIUM_POOL_ID_LEN {
        return Err(ActiveUserTransactionError::InvalidData(
            "pool_id invalid length".to_string(),
        ));
    }
    Ok(())
}

/// Each direction fixes which side of the conversion is the ck (ICRC) token and
/// what kind the other side must be. `data` is immutable after creation and the
/// FE poller picks its settlement oracle from `direction`, so a pair that
/// contradicts the direction could never settle and would occupy one of the
/// user's slots forever — reject it up front. Kinds only, deliberately: any
/// EVM chain id and any ICRC ledger stay valid so testnets need no special
/// casing here.
fn require_chain_fusion_pair(data: &ChainFusionData) -> Result<(), ActiveUserTransactionError> {
    let is_btc = |t: &TokenId| matches!(t, TokenId::BtcNativeMainnet | TokenId::BtcNativeTestnet);
    let is_eth = |t: &TokenId| matches!(t, TokenId::EvmNative(_));
    let is_erc20 = |t: &TokenId| matches!(t, TokenId::Erc20(..));
    let is_ck = |t: &TokenId| matches!(t, TokenId::Icrc(_));

    let ok = match data.direction {
        ChainFusionDirection::BtcToCkBtc => is_btc(&data.source_token) && is_ck(&data.dest_token),
        ChainFusionDirection::CkBtcToBtc => is_ck(&data.source_token) && is_btc(&data.dest_token),
        ChainFusionDirection::EthToCkEth => is_eth(&data.source_token) && is_ck(&data.dest_token),
        ChainFusionDirection::CkEthToEth => is_ck(&data.source_token) && is_eth(&data.dest_token),
        ChainFusionDirection::Erc20ToCkErc20 => {
            is_erc20(&data.source_token) && is_ck(&data.dest_token)
        }
        ChainFusionDirection::CkErc20ToErc20 => {
            is_ck(&data.source_token) && is_erc20(&data.dest_token)
        }
    };

    if ok {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::InvalidData(
            "token pair does not match chain-fusion direction".to_string(),
        ))
    }
}

/// A mint spends ICP, in either of its spellings, and deposits into the cycles
/// ledger. Unlike the other variants, which check kinds only so that testnets
/// and new pairs need no change here, a mint has exactly one pair, and both
/// ledgers have the same id on every network (`icp_ledger` and `cycles_ledger`
/// in `dfx.json`), so both legs are pinned. `data` is immutable after creation,
/// so a row naming any other token would describe a mint that cannot exist.
fn require_cycles_mint_pair(data: &CyclesMintData) -> Result<(), ActiveUserTransactionError> {
    let is_icp = |t: &TokenId| match t {
        TokenId::IcpNative => true,
        TokenId::Icrc(ledger) => *ledger == *ICP_LEDGER,
        _ => false,
    };
    let is_cycles_ledger =
        |t: &TokenId| matches!(t, TokenId::Icrc(ledger) if *ledger == *CYCLES_LEDGER);

    if is_icp(&data.source_token) && is_cycles_ledger(&data.dest_token) {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::InvalidData(
            "cycles-mint tokens must be ICP as the source and the cycles ledger as the destination"
                .to_string(),
        ))
    }
}

/// An OISY Trade pair is two ledger principals on the Internet Computer, so a
/// row naming an EVM or Solana token is unsatisfiable by construction. `data` is
/// immutable after creation, so such a row could never settle and would occupy
/// one of the user's slots forever — reject it up front. Kinds only,
/// deliberately: any ICRC ledger stays valid, so a newly listed pair needs no
/// change here.
fn require_oisy_trade_pair(data: &OisyTradeData) -> Result<(), ActiveUserTransactionError> {
    let is_ic = |t: &TokenId| matches!(t, TokenId::Icrc(_) | TokenId::IcpNative);

    if is_ic(&data.source_token) && is_ic(&data.dest_token) {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::InvalidData(
            "oisy-trade tokens must both be Internet Computer ledgers".to_string(),
        ))
    }
}

fn require_evm_address(addr: &str) -> Result<(), ActiveUserTransactionError> {
    if addr.is_empty() || addr.len() > MAX_EVM_ADDRESS_LEN {
        return Err(ActiveUserTransactionError::InvalidData(
            "recipient_evm_address invalid length".to_string(),
        ));
    }
    if !addr.starts_with("0x") {
        return Err(ActiveUserTransactionError::InvalidData(
            "recipient_evm_address must start with 0x".to_string(),
        ));
    }
    if !addr[2..].chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ActiveUserTransactionError::InvalidData(
            "recipient_evm_address must be hex".to_string(),
        ));
    }
    Ok(())
}

/// The row tracks a *native XRP* payment, so a token from any other chain is
/// unsatisfiable by construction — the FE poller would have no ledger to ask.
/// `data` is immutable after creation, so such a row could never resolve and
/// would occupy one of the user's slots forever. Kinds only, deliberately: an
/// XRPL testnet token would be a new `TokenId` variant and belongs in this list
/// when it arrives, not a reason to loosen the check now.
fn require_xrp_token(token: &TokenId) -> Result<(), ActiveUserTransactionError> {
    if matches!(token, TokenId::XrpNativeMainnet) {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::InvalidData(
            "token must be a native XRP token".to_string(),
        ))
    }
}

/// A bound and a shape check, not a re-validation: the FE derives
/// `source_address` from the caller's own key and checks `destination_address`
/// against a full base58check validator before signing. What matters here is
/// that a row cannot carry an arbitrary string into permanent stable memory, and
/// that a value which could never name an XRPL account is refused rather than
/// stored. Mirrors `require_evm_address` — length, prefix, charset, no checksum.
fn require_xrp_address(addr: &str, field: &str) -> Result<(), ActiveUserTransactionError> {
    // Both ends, and the lower one matters as much: a string like `"r"` clears
    // the prefix and charset checks below while being far too short for
    // base58check to have produced it.
    if addr.len() < MIN_XRP_ADDRESS_LEN || addr.len() > MAX_XRP_ADDRESS_LEN {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{field} invalid length"
        )));
    }
    // Classic addresses carry the 0x00 version byte, which base58check always
    // renders as a leading `r`.
    if !addr.starts_with('r') {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{field} must start with r"
        )));
    }
    // XRPL orders the base58 alphabet differently from Bitcoin but uses the same
    // 58 characters: alphanumerics without `0`, `O`, `I` and `l`.
    if !addr
        .chars()
        .all(|c| c.is_ascii_alphanumeric() && !matches!(c, '0' | 'O' | 'I' | 'l'))
    {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{field} must be base58"
        )));
    }
    Ok(())
}

/// A swap from native XRP pays its deposit from the user's XRP address, and the
/// one-payment-in-flight check can only count that payment if the row names the
/// address — without it, a second payment from the same address would pass.
/// Any other source makes no XRP payment, so an address there has no meaning and
/// is refused rather than stored.
fn require_near_intents_source_address(
    data: &NearIntentsData,
) -> Result<(), ActiveUserTransactionError> {
    match (&data.source_token, data.source_address.as_deref()) {
        (TokenId::XrpNativeMainnet, Some(address)) => {
            require_xrp_address(address, "source_address")
        }
        (TokenId::XrpNativeMainnet, None) => Err(ActiveUserTransactionError::InvalidData(
            "source_address is required for a native XRP source".to_string(),
        )),
        (_, Some(_)) => Err(ActiveUserTransactionError::InvalidData(
            "source_address is only allowed for a native XRP source".to_string(),
        )),
        (_, None) => Ok(()),
    }
}

/// XRPL answers a payment whose destination is its sender `temREDUNDANT`, which
/// is never applied — so such a row describes a payment that cannot exist, and
/// the FE refuses it from the arguments alone before signing. Same reasoning as
/// the pair checks above: immutable data that could never resolve.
fn require_distinct_xrp_accounts(data: &XrpData) -> Result<(), ActiveUserTransactionError> {
    // Compared raw, like everywhere else this address travels: a classic address
    // is base58 over a checksummed payload, so case is significant and two forms
    // differing in it are not one address.
    if data.source_address == data.destination_address {
        return Err(ActiveUserTransactionError::InvalidData(
            "destination_address must differ from source_address".to_string(),
        ));
    }
    Ok(())
}

/// The two refs an XRP row is polled with, required because a row without them
/// can never resolve.
///
/// The resolver refuses to guess: given no usable poll keys it returns without
/// touching the node, which is correct — a row that cannot name what to poll must
/// not be closed on an assumption. But an open row also refuses every later send
/// from its address, and the frontend offers no way to dismiss one that is not
/// terminal, so such a row would deny that address permanently.
///
/// Bounded tighter than the resolver parses: a ledger index is a `UInt32`, so a
/// value accepted here is always one the resolver can use.
fn require_xrp_refs(refs: &[ActiveUserTransactionRef]) -> Result<(), ActiveUserTransactionError> {
    let value = |key: &str| {
        refs.iter()
            .find(|ActiveUserTransactionRef { key: k, .. }| k == key)
            .map(|ActiveUserTransactionRef { value, .. }| value.as_str())
    };

    let Some(tx_hash) = value(XRP_REF_TX_HASH) else {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{XRP_REF_TX_HASH} is required"
        )));
    };

    if tx_hash.len() != XRP_TX_HASH_LEN || !tx_hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{XRP_REF_TX_HASH} must be {XRP_TX_HASH_LEN} hex characters"
        )));
    }

    let Some(last_ledger_sequence) = value(XRP_REF_LAST_LEDGER_SEQUENCE) else {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{XRP_REF_LAST_LEDGER_SEQUENCE} is required"
        )));
    };

    // Digits only, then a `u32` parse: the resolver rejects anything `Number()`
    // would coerce, and a ledger index the transaction was signed against is
    // always a positive `UInt32`.
    if !last_ledger_sequence.chars().all(|c| c.is_ascii_digit())
        || last_ledger_sequence.parse::<u32>().is_ok_and(|n| n == 0)
        || last_ledger_sequence.parse::<u32>().is_err()
    {
        return Err(ActiveUserTransactionError::InvalidData(format!(
            "{XRP_REF_LAST_LEDGER_SEQUENCE} must be a positive UInt32"
        )));
    }

    Ok(())
}

fn validate_transition(
    from: &ActiveUserTransactionStatus,
    to: &ActiveUserTransactionStatus,
) -> Result<(), ActiveUserTransactionError> {
    use ActiveUserTransactionStatus::{Executing, Failed, Pending, Succeeded};

    let ok = matches!(
        (from, to),
        (Pending, Pending | Executing | Succeeded | Failed)
            | (Executing, Executing | Succeeded | Failed)
            | (Succeeded, Succeeded)
            | (Failed, Failed)
    );

    if ok {
        Ok(())
    } else {
        Err(ActiveUserTransactionError::IllegalStatusTransition)
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::{Nat, Principal};
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use shared::types::{
        active_user_transaction::{
            ActiveUserTransaction, ActiveUserTransactionData, ActiveUserTransactionError,
            ActiveUserTransactionRef, ActiveUserTransactionStatus, ChainFusionData,
            ChainFusionDirection, CreateActiveUserTransactionRequest, CyclesMintData,
            LiquidiumAction, LiquidiumData, NearIntentsData, OisyTradeData, OisyTradeSide,
            OneSecEvmToIcpData, OneSecIcpToEvmData, UpdateActiveUserTransactionRequest, VeloraData,
            VeloraSwapMode, XrpData, MAX_ACTIVE_USER_TRANSACTIONS_PER_USER,
            MAX_LIQUIDIUM_POOL_ID_LEN, XRP_REF_LAST_LEDGER_SEQUENCE, XRP_REF_TX_HASH,
            XRP_TX_HASH_LEN,
        },
        custom_token::ErcTokenId,
        token_id::TokenId,
    };

    use super::{create, delete, list, update};
    use crate::types::maps::ActiveUserTransactionsMap;

    const PRINCIPAL_TEXT: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";
    const OTHER_PRINCIPAL_TEXT: &str =
        "535yc-uxytb-gfk7h-tny7p-vjkoe-i4krp-3qmcl-uqfgr-cpgej-yqtjq-rqe";

    fn setup() -> (
        ActiveUserTransactionsMap,
        RefCell<MemoryManager<DefaultMemoryImpl>>,
    ) {
        let mm = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map = ActiveUserTransactionsMap::init(mm.borrow().get(MemoryId::new(0)));
        (map, mm)
    }

    fn principal() -> Principal {
        Principal::from_text(PRINCIPAL_TEXT).unwrap()
    }

    fn other_principal() -> Principal {
        Principal::from_text(OTHER_PRINCIPAL_TEXT).unwrap()
    }

    fn sample_data() -> ActiveUserTransactionData {
        ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(1_000_000u64),
            recipient_evm_address: "0x0000000000000000000000000000000000000001".to_string(),
        })
    }

    fn create_req(id: &str) -> CreateActiveUserTransactionRequest {
        CreateActiveUserTransactionRequest {
            id: id.to_string(),
            data: sample_data(),
            progress_step: None,
            external_refs: vec![],
        }
    }

    #[test]
    fn create_and_get_roundtrip() {
        let (mut map, _mm) = setup();
        let tx = create(&mut map, principal(), create_req("id-1"), 1).expect("create");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
        assert_eq!(tx.created_at_ns, 1);
        assert_eq!(tx.updated_at_ns, 1);

        let res = list(&map, principal()).transactions;
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].id, "id-1");
    }

    #[test]
    fn duplicate_id_rejected() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("id-1"), 1).expect("first");
        let err = create(&mut map, principal(), create_req("id-1"), 2).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::AlreadyExists);
    }

    #[test]
    fn empty_id_rejected() {
        let (mut map, _mm) = setup();
        let err = create(&mut map, principal(), create_req(""), 1).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::InvalidId);
    }

    #[test]
    fn id_with_non_ascii_rejected() {
        let (mut map, _mm) = setup();
        let err = create(&mut map, principal(), create_req("naïve-id"), 1).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::InvalidId);
    }

    #[test]
    fn zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(0u32),
            recipient_evm_address: "0x0000000000000000000000000000000000000001".to_string(),
        });
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    /// 2^256 - 1, the widest base-unit amount any supported chain can express.
    const MAX_WIDTH_AMOUNT: &[u8] =
        b"115792089237316195423570985008687907853269984665640564039457584007913129639935";
    /// 2^256, one bit too wide.
    const OVER_WIDTH_AMOUNT: &[u8] =
        b"115792089237316195423570985008687907853269984665640564039457584007913129639936";

    fn data_with_amount(amount: Nat) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount,
            source_address: None,
        })
    }

    #[test]
    fn max_width_amount_accepted() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = data_with_amount(Nat::parse(MAX_WIDTH_AMOUNT).unwrap());
        create(&mut map, principal(), req, 1).expect("create");
    }

    #[test]
    fn oversized_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = data_with_amount(Nat::parse(OVER_WIDTH_AMOUNT).unwrap());
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        assert_eq!(list(&map, principal()).transactions.len(), 0);
    }

    /// A `Nat` is variable-length on the wire, so the payload an attacker can
    /// attach is bounded only by the ingress message limit, not by 256 bits.
    #[test]
    fn far_oversized_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = data_with_amount(Nat::parse(&b"9".repeat(10_000)).unwrap());
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        assert_eq!(list(&map, principal()).transactions.len(), 0);
    }

    #[test]
    fn malformed_eth_address_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = ActiveUserTransactionData::OneSecIcpToEvm(OneSecIcpToEvmData {
            source_token: TokenId::IcpNative,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(1u32),
            recipient_evm_address: "not-an-address".to_string(),
        });
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    fn liquidium_data(amount: u64, pool_id: &str) -> ActiveUserTransactionData {
        ActiveUserTransactionData::Liquidium(LiquidiumData {
            action: LiquidiumAction::Supply,
            pool_id: pool_id.to_string(),
            token: TokenId::Icrc(Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap()),
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn liquidium_create_roundtrip() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        req.data = liquidium_data(5_100, "mxzaz-hqaaa-aaaar-qaada-cai");
        let tx = create(&mut map, principal(), req, 1).expect("create");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
        assert_eq!(
            tx.data,
            liquidium_data(5_100, "mxzaz-hqaaa-aaaar-qaada-cai")
        );
    }

    #[test]
    fn liquidium_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        req.data = liquidium_data(0, "mxzaz-hqaaa-aaaar-qaada-cai");
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn liquidium_empty_pool_id_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        req.data = liquidium_data(5_100, "");
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn liquidium_overlong_pool_id_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("liq-1");
        // A canister principal text is at most 63 chars; anything longer can
        // never be a valid pool id.
        req.data = liquidium_data(5_100, &"a".repeat(MAX_LIQUIDIUM_POOL_ID_LEN + 1));
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    fn near_intents_data(amount: u64) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::EvmNative(8453),
            dest_token: TokenId::SolNativeMainnet,
            amount: Nat::from(amount),
            source_address: None,
        })
    }

    #[test]
    fn near_intents_create_roundtrip() {
        let (mut map, _mm) = setup();
        let mut req = create_req("near-1");
        req.data = near_intents_data(250_000);
        let tx = create(&mut map, principal(), req, 1).expect("create");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
        assert_eq!(tx.data, near_intents_data(250_000));
    }

    #[test]
    fn near_intents_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("near-1");
        req.data = near_intents_data(0);
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    fn near_intents_btc_source_data(amount: u64) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::BtcNativeMainnet,
            dest_token: TokenId::EvmNative(8453),
            amount: Nat::from(amount),
            source_address: None,
        })
    }

    fn near_intents_btc_dest_data(amount: u64) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::SolNativeMainnet,
            dest_token: TokenId::BtcNativeMainnet,
            amount: Nat::from(amount),
            source_address: None,
        })
    }

    #[test]
    fn near_intents_btc_create_roundtrip() {
        // The BTC-via-NEAR-Intents swap relies on the chain-agnostic variant
        // accepting BTC token ids in either position with no extra validation;
        // pin both directions so a validation change cannot break it silently.
        for (id, data) in [
            ("near-btc-src", near_intents_btc_source_data(250_000)),
            ("near-btc-dst", near_intents_btc_dest_data(250_000)),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req(id);
            req.data = data.clone();
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
            assert_eq!(tx.data, data);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(listed[0].data, data);
        }
    }

    #[test]
    fn near_intents_btc_zero_amount_rejected() {
        for data in [
            near_intents_btc_source_data(0),
            near_intents_btc_dest_data(0),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req("near-btc-1");
            req.data = data;
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    fn velora_data(amount: u64, mode: VeloraSwapMode) -> ActiveUserTransactionData {
        ActiveUserTransactionData::Velora(VeloraData {
            mode,
            source_token: TokenId::Erc20(
                ErcTokenId("0x0000000000000000000000000000000000000abc".to_string()),
                1,
            ),
            dest_token: TokenId::Erc20(
                ErcTokenId("0x0000000000000000000000000000000000000def".to_string()),
                1,
            ),
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn velora_create_roundtrip() {
        // Both modes share one variant, so both must survive create unchanged —
        // the mode is what the FE poller routes on.
        for mode in [VeloraSwapMode::Delta, VeloraSwapMode::Market] {
            let (mut map, _mm) = setup();
            let mut req = create_req("velora-1");
            req.data = velora_data(7_500, mode.clone());
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);
            assert_eq!(tx.data, velora_data(7_500, mode));
        }
    }

    #[test]
    fn velora_zero_amount_rejected() {
        for mode in [VeloraSwapMode::Delta, VeloraSwapMode::Market] {
            let (mut map, _mm) = setup();
            let mut req = create_req("velora-1");
            req.data = velora_data(0, mode);
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    const CKBTC_LEDGER: &str = "mxzaz-hqaaa-aaaar-qaada-cai";
    const CKETH_LEDGER: &str = "ss2fx-dyaaa-aaaar-qacoq-cai";
    const CKUSDC_LEDGER: &str = "xevnm-gaaaa-aaaar-qafnq-cai";
    const USDC_ETHEREUM: &str = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

    fn icrc(ledger: &str) -> TokenId {
        TokenId::Icrc(Principal::from_text(ledger).unwrap())
    }

    fn chain_fusion_data(
        amount: u64,
        direction: ChainFusionDirection,
    ) -> ActiveUserTransactionData {
        // Mirrors `chain_fusion_leg` in the shared-crate tests: each direction
        // carries the token pair it can actually settle, since `validate_data`
        // rejects a pair that contradicts the direction.
        let (source_token, dest_token) = match &direction {
            ChainFusionDirection::BtcToCkBtc => (TokenId::BtcNativeMainnet, icrc(CKBTC_LEDGER)),
            ChainFusionDirection::CkBtcToBtc => (icrc(CKBTC_LEDGER), TokenId::BtcNativeMainnet),
            ChainFusionDirection::EthToCkEth => (TokenId::EvmNative(1), icrc(CKETH_LEDGER)),
            ChainFusionDirection::CkEthToEth => (icrc(CKETH_LEDGER), TokenId::EvmNative(1)),
            ChainFusionDirection::Erc20ToCkErc20 => (
                TokenId::Erc20(ErcTokenId(USDC_ETHEREUM.to_string()), 1),
                icrc(CKUSDC_LEDGER),
            ),
            ChainFusionDirection::CkErc20ToErc20 => (
                icrc(CKUSDC_LEDGER),
                TokenId::Erc20(ErcTokenId(USDC_ETHEREUM.to_string()), 1),
            ),
        };
        ActiveUserTransactionData::ChainFusion(ChainFusionData {
            direction,
            source_token,
            dest_token,
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn chain_fusion_create_roundtrip() {
        // All six directions share one variant, so each must survive create —
        // and the stable-memory read path — unchanged; the direction is what
        // the FE poller routes on.
        for direction in ChainFusionDirection::ALL {
            let (mut map, _mm) = setup();
            let mut req = create_req("ck-1");
            req.data = chain_fusion_data(1_000, direction.clone());
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(listed[0].data, chain_fusion_data(1_000, direction));
        }
    }

    #[test]
    fn chain_fusion_zero_amount_rejected() {
        for direction in ChainFusionDirection::ALL {
            let (mut map, _mm) = setup();
            let mut req = create_req("ck-1");
            req.data = chain_fusion_data(0, direction);
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    #[test]
    fn chain_fusion_mismatched_token_pair_rejected() {
        // The BtcToCkBtc pair submitted under every other direction: `data` is
        // immutable after creation, so a row whose tokens contradict its
        // direction could never settle and must be rejected up front.
        for direction in ChainFusionDirection::ALL {
            if direction == ChainFusionDirection::BtcToCkBtc {
                continue;
            }
            let (mut map, _mm) = setup();
            let mut req = create_req("ck-1");
            req.data = ActiveUserTransactionData::ChainFusion(ChainFusionData {
                direction,
                source_token: TokenId::BtcNativeMainnet,
                dest_token: icrc(CKBTC_LEDGER),
                amount: Nat::from(1_000u64),
            });
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        }
    }

    const ICP_LEDGER: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const CYCLES_LEDGER: &str = "um5iw-rqaaa-aaaaq-qaaba-cai";

    fn cycles_mint_data(
        amount: u64,
        source_token: TokenId,
        dest_token: TokenId,
    ) -> ActiveUserTransactionData {
        ActiveUserTransactionData::CyclesMint(CyclesMintData {
            source_token,
            dest_token,
            amount: Nat::from(amount),
            transfer_created_at_ns: 1_790_000_000_000_000_000,
        })
    }

    #[test]
    fn cycles_mint_create_roundtrip() {
        // The wallet sends ICP as `Icrc` of its ledger, while `IcpNative` exists
        // for the exchange-rate path, so both spellings of the source must
        // survive create and the stable-memory read path.
        for source_token in [icrc(ICP_LEDGER), TokenId::IcpNative] {
            let (mut map, _mm) = setup();
            let mut req = create_req("mint-1");
            req.data = cycles_mint_data(100_000_000, source_token.clone(), icrc(CYCLES_LEDGER));
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(
                listed[0].data,
                cycles_mint_data(100_000_000, source_token, icrc(CYCLES_LEDGER))
            );
        }
    }

    #[test]
    fn cycles_mint_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("mint-1");
        req.data = cycles_mint_data(0, icrc(ICP_LEDGER), icrc(CYCLES_LEDGER));
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    /// The width bound the other variants share, checked on this arm too.
    #[test]
    fn cycles_mint_oversized_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("mint-1");
        req.data = ActiveUserTransactionData::CyclesMint(CyclesMintData {
            source_token: icrc(ICP_LEDGER),
            dest_token: icrc(CYCLES_LEDGER),
            amount: Nat::parse(OVER_WIDTH_AMOUNT).unwrap(),
            transfer_created_at_ns: 1_790_000_000_000_000_000,
        });
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
        assert_eq!(list(&map, principal()).transactions.len(), 0);
    }

    #[test]
    fn cycles_mint_wrong_token_kinds_rejected() {
        // A mint spends ICP and deposits into the cycles ledger, so any other
        // kind on either side could never settle — and `data` is immutable after
        // creation. `IcpNative` is a valid source but never a destination: the
        // CMC deposits into the cycles ledger.
        let non_ic = [
            TokenId::EvmNative(1),
            TokenId::Erc20(ErcTokenId(USDC_ETHEREUM.to_string()), 1),
            TokenId::BtcNativeMainnet,
            TokenId::SolNativeMainnet,
        ];
        let mut pairs: Vec<(TokenId, TokenId)> = non_ic
            .iter()
            .flat_map(|token| {
                [
                    (token.clone(), icrc(CYCLES_LEDGER)),
                    (icrc(ICP_LEDGER), token.clone()),
                ]
            })
            .collect();
        pairs.push((icrc(ICP_LEDGER), TokenId::IcpNative));

        for (source_token, dest_token) in pairs {
            let (mut map, _mm) = setup();
            let mut req = create_req("mint-1");
            req.data = cycles_mint_data(100_000_000, source_token, dest_token);
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert_eq!(err, cycles_mint_pair_error());
        }
    }

    #[test]
    fn cycles_mint_other_ledgers_rejected() {
        // Right kinds, wrong ledgers: only ICP into the cycles ledger is a mint.
        let pairs = [
            (icrc(CKBTC_LEDGER), icrc(CYCLES_LEDGER)),
            (icrc(ICP_LEDGER), icrc(CKUSDC_LEDGER)),
            (icrc(CKBTC_LEDGER), icrc(CKUSDC_LEDGER)),
            (TokenId::IcpNative, icrc(ICP_LEDGER)),
        ];

        for (source_token, dest_token) in pairs {
            let (mut map, _mm) = setup();
            let mut req = create_req("mint-1");
            req.data = cycles_mint_data(100_000_000, source_token, dest_token);
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert_eq!(err, cycles_mint_pair_error());
        }
    }

    fn cycles_mint_pair_error() -> ActiveUserTransactionError {
        ActiveUserTransactionError::InvalidData(
            "cycles-mint tokens must be ICP as the source and the cycles ledger as the destination"
                .to_string(),
        )
    }

    fn oisy_trade_data(
        amount: u64,
        side: OisyTradeSide,
        source_token: TokenId,
        dest_token: TokenId,
    ) -> ActiveUserTransactionData {
        ActiveUserTransactionData::OisyTrade(OisyTradeData {
            side,
            source_token,
            dest_token,
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn oisy_trade_create_roundtrip() {
        // The ICP ledger reaches the wallet as `IcpNative` rather than `Icrc`,
        // so both spellings of an IC leg must survive create — and the
        // stable-memory read path — in either position. `side` fixes the
        // base/quote orientation the token pair alone cannot express, and the
        // recovery paths route on it, so both sides must survive too.
        for (side, source_token, dest_token) in [
            (OisyTradeSide::Sell, icrc(CKBTC_LEDGER), icrc(CKUSDC_LEDGER)),
            (OisyTradeSide::Buy, icrc(CKUSDC_LEDGER), icrc(CKBTC_LEDGER)),
            (OisyTradeSide::Sell, TokenId::IcpNative, icrc(CKUSDC_LEDGER)),
            (OisyTradeSide::Buy, icrc(CKUSDC_LEDGER), TokenId::IcpNative),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req("trade-1");
            req.data = oisy_trade_data(
                1_000_000,
                side.clone(),
                source_token.clone(),
                dest_token.clone(),
            );
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(
                listed[0].data,
                oisy_trade_data(1_000_000, side, source_token, dest_token)
            );
        }
    }

    #[test]
    fn oisy_trade_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("trade-1");
        req.data = oisy_trade_data(
            0,
            OisyTradeSide::Sell,
            icrc(CKBTC_LEDGER),
            icrc(CKUSDC_LEDGER),
        );
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn oisy_trade_non_ic_token_rejected() {
        // OISY Trade pairs are ledger principals, so a non-IC leg in either
        // position is unsatisfiable by construction — and `data` is immutable
        // after creation, so the row could never settle.
        let non_ic = [
            TokenId::EvmNative(1),
            TokenId::Erc20(ErcTokenId(USDC_ETHEREUM.to_string()), 1),
            TokenId::BtcNativeMainnet,
            TokenId::SolNativeMainnet,
        ];

        for token in non_ic {
            for (source_token, dest_token) in [
                (token.clone(), icrc(CKUSDC_LEDGER)),
                (icrc(CKUSDC_LEDGER), token.clone()),
            ] {
                let (mut map, _mm) = setup();
                let mut req = create_req("trade-1");
                req.data =
                    oisy_trade_data(1_000_000, OisyTradeSide::Sell, source_token, dest_token);
                let err = create(&mut map, principal(), req, 1).unwrap_err();
                assert_eq!(
                    err,
                    ActiveUserTransactionError::InvalidData(
                        "oisy-trade tokens must both be Internet Computer ledgers".to_string()
                    )
                );
            }
        }
    }

    const XRP_SOURCE: &str = "rBNLHADLTBV5WqQ8rDyLaTrGXMxrjfzoMi";
    const XRP_DESTINATION: &str = "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv";
    const XRP_OTHER_SOURCE: &str = "rETD6N4kWuW9tDE6ewyzZsXw2uqzDAPQwg";
    const XRP_OTHER_DESTINATION: &str = "rJkHLRqmFWoMGPsBdP8ZPMK8PR7GtbxTWi";

    fn xrp_data(
        amount: u64,
        fee: u64,
        destination_tag: Option<u32>,
        source_address: &str,
        destination_address: &str,
    ) -> ActiveUserTransactionData {
        ActiveUserTransactionData::Xrp(XrpData {
            token: TokenId::XrpNativeMainnet,
            source_address: source_address.to_string(),
            destination_address: destination_address.to_string(),
            destination_tag,
            amount: Nat::from(amount),
            fee: Nat::from(fee),
        })
    }

    const XRP_TX_HASH: &str = "8F2C4D1A9B3E5760A1C8D4F2B6E093751A4C8D2F6B0E93751A4C8D2F6B0E9375";
    const XRP_LAST_LEDGER_SEQUENCE: &str = "96312004";

    /// The refs every XRP row must carry. Tests not about the refs use this, so
    /// they still exercise the check they are named for.
    fn xrp_refs() -> Vec<ActiveUserTransactionRef> {
        vec![
            ActiveUserTransactionRef {
                key: XRP_REF_TX_HASH.to_string(),
                value: XRP_TX_HASH.to_string(),
            },
            ActiveUserTransactionRef {
                key: XRP_REF_LAST_LEDGER_SEQUENCE.to_string(),
                value: XRP_LAST_LEDGER_SEQUENCE.to_string(),
            },
        ]
    }

    fn xrp_refs_without(key: &str) -> Vec<ActiveUserTransactionRef> {
        xrp_refs().into_iter().filter(|r| r.key != key).collect()
    }

    fn xrp_refs_with(key: &str, value: &str) -> Vec<ActiveUserTransactionRef> {
        let mut refs = xrp_refs_without(key);
        refs.push(ActiveUserTransactionRef {
            key: key.to_string(),
            value: value.to_string(),
        });
        refs
    }

    #[test]
    fn xrp_create_roundtrip() {
        // `destination_tag` has to survive create — and the stable-memory read
        // path — in all three shapes: `0` is a real XRPL tag, `None` is its
        // absence, and `u32::MAX` is the value a narrower encoding would
        // truncate. Collapsing any of them changes the payment.
        for destination_tag in [None, Some(0), Some(u32::MAX)] {
            let (mut map, _mm) = setup();
            let mut req = create_req("xrp-1");
            req.data = xrp_data(25_000_000, 12, destination_tag, XRP_SOURCE, XRP_DESTINATION);
            req.external_refs = xrp_refs();
            let tx = create(&mut map, principal(), req, 1).expect("create");
            assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);

            let listed = list(&map, principal()).transactions;
            assert_eq!(listed.len(), 1);
            assert_eq!(
                listed[0].data,
                xrp_data(25_000_000, 12, destination_tag, XRP_SOURCE, XRP_DESTINATION)
            );
        }
    }

    #[test]
    fn xrp_zero_amount_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("xrp-1");
        req.data = xrp_data(0, 12, None, XRP_SOURCE, XRP_DESTINATION);
        req.external_refs = xrp_refs();
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn xrp_zero_fee_rejected() {
        // Every XRPL transaction destroys a non-zero transaction cost, so a row
        // claiming a zero fee describes a payment that could not have been
        // signed.
        //
        // The exact message is asserted, not just the variant: the fee is the
        // second `Nat` this payload validates, and a shared validator that named
        // the wrong field would send the reader to the amount instead.
        let (mut map, _mm) = setup();
        let mut req = create_req("xrp-1");
        req.data = xrp_data(25_000_000, 0, None, XRP_SOURCE, XRP_DESTINATION);
        req.external_refs = xrp_refs();
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData("fee must be greater than zero".to_string())
        );
    }

    #[test]
    fn xrp_oversized_fee_rejected() {
        // The other end of the same bound, and the other message that has to name
        // the fee rather than the amount.
        let (mut map, _mm) = setup();
        let mut req = create_req("xrp-1");
        req.data = ActiveUserTransactionData::Xrp(XrpData {
            token: TokenId::XrpNativeMainnet,
            source_address: XRP_SOURCE.to_string(),
            destination_address: XRP_DESTINATION.to_string(),
            destination_tag: None,
            amount: Nat::from(25_000_000u64),
            fee: Nat::parse(MAX_WIDTH_AMOUNT).unwrap() + Nat::from(1u32),
        });
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData("fee is too large".to_string())
        );
    }

    #[test]
    fn xrp_zero_amount_names_the_amount() {
        // The counterpart to the two above: making the validator field-aware must
        // not make an amount problem report as a fee one.
        let (mut map, _mm) = setup();
        let mut req = create_req("xrp-1");
        req.data = xrp_data(0, 12, None, XRP_SOURCE, XRP_DESTINATION);
        req.external_refs = xrp_refs();
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData("amount must be greater than zero".to_string())
        );
    }

    #[test]
    fn xrp_non_xrp_token_rejected() {
        // The resolver polls the XRP Ledger for this row, so a token from any
        // other chain leaves it with nothing to ask — and `data` is immutable
        // after creation, so the row could never resolve.
        for token in [
            TokenId::EvmNative(1),
            TokenId::IcpNative,
            TokenId::BtcNativeMainnet,
            TokenId::SolNativeMainnet,
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req("xrp-1");
            req.data = ActiveUserTransactionData::Xrp(XrpData {
                token,
                source_address: XRP_SOURCE.to_string(),
                destination_address: XRP_DESTINATION.to_string(),
                destination_tag: None,
                amount: Nat::from(25_000_000u64),
                fee: Nat::from(12u64),
            });
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert_eq!(
                err,
                ActiveUserTransactionError::InvalidData(
                    "token must be a native XRP token".to_string()
                )
            );
        }
    }

    #[test]
    fn xrp_malformed_address_rejected() {
        // Both fields are checked, and the error names which one — the guard
        // reads `source_address`, so a row that stored a wrong one would gate
        // the wrong account.
        for (source, destination, expected) in [
            ("", XRP_DESTINATION, "source_address invalid length"),
            (XRP_SOURCE, "", "destination_address invalid length"),
            // Clears the prefix and charset checks but is far too short for
            // base58check to have produced it — the lower bound is the only
            // thing that refuses it.
            ("r", XRP_DESTINATION, "source_address invalid length"),
            // One character below the bound, still valid base58 with the right
            // prefix, so the length is the only thing that can refuse it.
            (
                "rBNLHADLTBV5WqQ8rDyLaTrG",
                XRP_DESTINATION,
                "source_address invalid length",
            ),
            (XRP_SOURCE, "r", "destination_address invalid length"),
            (
                "rBNLHADLTBV5WqQ8rDyLaTrGXMxrjfzoMiXXXXX",
                XRP_DESTINATION,
                "source_address invalid length",
            ),
            (
                "xBNLHADLTBV5WqQ8rDyLaTrGXMxrjfzoMi",
                XRP_DESTINATION,
                "source_address must start with r",
            ),
            // `0`, `O`, `I` and `l` are the four characters base58 omits, so an
            // address carrying one cannot have come from a base58 encoder.
            (
                "rBNLHADLTBV5WqQ8rDyLaTrGXMxrjfzoM0",
                XRP_DESTINATION,
                "source_address must be base58",
            ),
            (
                XRP_SOURCE,
                "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBl",
                "destination_address must be base58",
            ),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req("xrp-1");
            req.data = xrp_data(25_000_000, 12, None, source, destination);
            req.external_refs = xrp_refs();
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert_eq!(
                err,
                ActiveUserTransactionError::InvalidData(expected.to_string())
            );
        }
    }

    // The invariant the whole XRP guard exists for, enforced here because the
    // frontend's own check cannot be atomic with this create.
    #[test]
    fn xrp_second_open_send_from_the_same_address_rejected() {
        let (mut map, _mm) = setup();

        let mut first = create_req("xrp-1");
        first.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
        first.external_refs = xrp_refs();
        create(&mut map, principal(), first, 1).expect("first send");

        // A different id and a different destination: neither is what refuses it.
        let mut second = create_req("xrp-2");
        second.data = xrp_data(1, 12, Some(7), XRP_SOURCE, XRP_OTHER_DESTINATION);
        second.external_refs = xrp_refs();
        let err = create(&mut map, principal(), second, 2).unwrap_err();

        assert_eq!(err, ActiveUserTransactionError::AlreadyInFlight);
    }

    #[test]
    fn xrp_second_send_rejected_while_the_first_is_executing() {
        // `Executing` is non-terminal too, and a row that has advanced past
        // `Pending` is exactly one whose sequence is still in play.
        let (mut map, _mm) = setup();

        let mut first = create_req("xrp-1");
        first.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
        first.external_refs = xrp_refs();
        create(&mut map, principal(), first, 1).expect("first send");
        update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "xrp-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Executing),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            2,
        )
        .expect("advance");

        let mut second = create_req("xrp-2");
        second.data = xrp_data(1, 12, None, XRP_SOURCE, XRP_DESTINATION);
        second.external_refs = xrp_refs();
        let err = create(&mut map, principal(), second, 3).unwrap_err();

        assert_eq!(err, ActiveUserTransactionError::AlreadyInFlight);
    }

    #[test]
    fn xrp_second_send_allowed_once_the_first_is_terminal() {
        // Bounded by design: the record self-clears within the signed validity
        // window, and the address is free again the moment it does.
        for status in [
            ActiveUserTransactionStatus::Succeeded,
            ActiveUserTransactionStatus::Failed,
        ] {
            let (mut map, _mm) = setup();

            let mut first = create_req("xrp-1");
            first.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
            first.external_refs = xrp_refs();
            create(&mut map, principal(), first, 1).expect("first send");
            update(
                &mut map,
                principal(),
                UpdateActiveUserTransactionRequest {
                    id: "xrp-1".to_string(),
                    status: Some(status),
                    progress_step: None,
                    external_refs: None,
                    error: None,
                },
                2,
            )
            .expect("resolve");

            let mut second = create_req("xrp-2");
            second.data = xrp_data(1, 12, None, XRP_SOURCE, XRP_DESTINATION);
            second.external_refs = xrp_refs();

            create(&mut map, principal(), second, 3).expect("second send");
        }
    }

    #[test]
    fn xrp_open_send_does_not_block_another_address() {
        // Per address, not per user: a record for a different address says
        // nothing about this one's sequence.
        let (mut map, _mm) = setup();

        let mut first = create_req("xrp-1");
        first.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
        first.external_refs = xrp_refs();
        create(&mut map, principal(), first, 1).expect("first send");

        let mut second = create_req("xrp-2");
        second.data = xrp_data(1, 12, None, XRP_OTHER_SOURCE, XRP_DESTINATION);
        second.external_refs = xrp_refs();

        create(&mut map, principal(), second, 2).expect("other address");
    }

    #[test]
    fn xrp_open_send_does_not_block_another_user() {
        // The scan is principal-scoped, so one user's open payment cannot refuse
        // another's — even from the same address, which two users cannot share
        // anyway.
        let (mut map, _mm) = setup();

        let mut first = create_req("xrp-1");
        first.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
        first.external_refs = xrp_refs();
        create(&mut map, principal(), first, 1).expect("first send");

        let mut second = create_req("xrp-1");
        second.data = xrp_data(1, 12, None, XRP_SOURCE, XRP_DESTINATION);
        second.external_refs = xrp_refs();

        create(&mut map, other_principal(), second, 2).expect("other user");
    }

    #[test]
    fn xrp_open_send_does_not_block_another_flow() {
        // Only XRP carries this constraint; the six swap flows are unaffected.
        let (mut map, _mm) = setup();

        let mut first = create_req("xrp-1");
        first.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
        first.external_refs = xrp_refs();
        create(&mut map, principal(), first, 1).expect("first send");

        create(&mut map, principal(), create_req("swap-1"), 2).expect("another flow");
    }

    #[test]
    fn xrp_self_payment_rejected() {
        // XRPL answers `temREDUNDANT` and never applies it, so this row could
        // never resolve.
        let (mut map, _mm) = setup();
        let mut req = create_req("xrp-1");
        req.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_SOURCE);
        req.external_refs = xrp_refs();
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData(
                "destination_address must differ from source_address".to_string()
            )
        );
    }

    /// Helper for the ref tests: an otherwise-valid XRP create carrying `refs`.
    fn xrp_create_with_refs(
        map: &mut ActiveUserTransactionsMap,
        refs: Vec<ActiveUserTransactionRef>,
    ) -> Result<ActiveUserTransaction, ActiveUserTransactionError> {
        let mut req = create_req("xrp-1");
        req.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
        req.external_refs = refs;
        create(map, principal(), req, 1)
    }

    #[test]
    fn xrp_create_without_poll_keys_rejected() {
        // Both are derived from the signed blob before this call, so a row
        // without them describes a payment nothing can poll — and an unpollable
        // row is worse than a rejected create, because it is `Pending`, it
        // refuses every later send from its address, and nothing clears it.
        for (missing, expected) in [
            (XRP_REF_TX_HASH, "tx_hash is required"),
            (
                XRP_REF_LAST_LEDGER_SEQUENCE,
                "last_ledger_sequence is required",
            ),
        ] {
            let (mut map, _mm) = setup();
            let err = xrp_create_with_refs(&mut map, xrp_refs_without(missing)).unwrap_err();
            assert_eq!(
                err,
                ActiveUserTransactionError::InvalidData(expected.to_string())
            );
            assert!(
                list(&map, principal()).transactions.is_empty(),
                "a rejected create must not leave a row behind"
            );
        }
    }

    #[test]
    fn xrp_create_with_malformed_tx_hash_rejected() {
        // Length and alphabet, because a hash that is not one cannot be looked
        // up: the poll would 404 forever rather than resolve.
        let too_short = &XRP_TX_HASH[..63];
        let too_long = format!("{XRP_TX_HASH}0");
        let non_hex = format!("{}Z", &XRP_TX_HASH[..63]);
        assert_eq!(too_short.len(), XRP_TX_HASH_LEN - 1);
        assert_eq!(too_long.len(), XRP_TX_HASH_LEN + 1);
        assert_eq!(non_hex.len(), XRP_TX_HASH_LEN);

        for value in ["", too_short, too_long.as_str(), non_hex.as_str()] {
            let (mut map, _mm) = setup();
            let err =
                xrp_create_with_refs(&mut map, xrp_refs_with(XRP_REF_TX_HASH, value)).unwrap_err();
            assert_eq!(
                err,
                ActiveUserTransactionError::InvalidData(
                    "tx_hash must be 64 hex characters".to_string()
                ),
                "accepted {value:?}"
            );
        }
    }

    #[test]
    fn xrp_create_with_unusable_last_ledger_sequence_rejected() {
        // Mirrors what the resolver refuses to parse. `Number(" 12")`,
        // `Number("0x1f")` and `Number("1e5")` all produce a number, and each
        // would decide expiry against a ledger range the payment was never
        // signed against — so digits only, then a `UInt32` that is not zero.
        let over_u32 = (u64::from(u32::MAX) + 1).to_string();

        for value in [
            "",
            " 12",
            "12 ",
            "0x1f",
            "1e5",
            "+7",
            "-7",
            "7.0",
            "0",
            over_u32.as_str(),
        ] {
            let (mut map, _mm) = setup();
            let err =
                xrp_create_with_refs(&mut map, xrp_refs_with(XRP_REF_LAST_LEDGER_SEQUENCE, value))
                    .unwrap_err();
            assert_eq!(
                err,
                ActiveUserTransactionError::InvalidData(
                    "last_ledger_sequence must be a positive UInt32".to_string()
                ),
                "accepted {value:?}"
            );
        }
    }

    #[test]
    fn xrp_create_accepts_display_refs_alongside_the_poll_keys() {
        // The requirement is "these two are present", not "only these two" —
        // the row also snapshots what it needs to render itself later.
        let (mut map, _mm) = setup();
        let mut refs = xrp_refs();
        for (key, value) in [
            ("amount", "25"),
            ("token_symbol", "XRP"),
            ("network_symbol", "XRP"),
        ] {
            refs.push(ActiveUserTransactionRef {
                key: key.to_string(),
                value: value.to_string(),
            });
        }

        let tx = xrp_create_with_refs(&mut map, refs.clone()).expect("create");
        assert_eq!(tx.external_refs, refs);
    }

    #[test]
    fn xrp_update_cannot_strip_the_poll_keys() {
        // `external_refs` is replaced wholesale, so without this check an update
        // reaches the same unresolvable state `create` rejects — on a row that
        // is already refusing sends from its address.
        let (mut map, _mm) = setup();
        xrp_create_with_refs(&mut map, xrp_refs()).expect("create");

        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "xrp-1".to_string(),
                status: None,
                progress_step: None,
                external_refs: Some(xrp_refs_without(XRP_REF_TX_HASH)),
                error: None,
            },
            2,
        )
        .unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData("tx_hash is required".to_string())
        );

        // The stored row is untouched, and the update the resolver actually
        // sends — status only — still goes through.
        let tx = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "xrp-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            3,
        )
        .expect("status-only update");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Succeeded);
        assert_eq!(tx.external_refs, xrp_refs());
    }

    #[test]
    fn poll_keys_are_required_of_xrp_rows_only() {
        // Guards against the check leaking into flows that have no such refs;
        // every other variant still creates with none.
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("other-1"), 1).expect("non-xrp create");
    }

    /// A NEAR Intents swap whose source is native XRP: its deposit is an XRP
    /// payment from `source_address`.
    fn xrp_swap_data(amount: u64, source_address: Option<&str>) -> ActiveUserTransactionData {
        ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::XrpNativeMainnet,
            dest_token: TokenId::EvmNative(1),
            amount: Nat::from(amount),
            source_address: source_address.map(str::to_string),
        })
    }

    fn create_xrp_send(map: &mut ActiveUserTransactionsMap, id: &str, source_address: &str) {
        let mut req = create_req(id);
        req.data = xrp_data(25_000_000, 12, None, source_address, XRP_DESTINATION);
        req.external_refs = xrp_refs();
        create(map, principal(), req, 1).expect("send");
    }

    fn create_xrp_swap(
        map: &mut ActiveUserTransactionsMap,
        id: &str,
        source_address: &str,
    ) -> Result<ActiveUserTransaction, ActiveUserTransactionError> {
        let mut req = create_req(id);
        req.data = xrp_swap_data(25_000_000, Some(source_address));
        req.external_refs = xrp_refs();
        create(map, principal(), req, 1)
    }

    fn set_status(
        map: &mut ActiveUserTransactionsMap,
        id: &str,
        status: ActiveUserTransactionStatus,
    ) {
        update(
            map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: id.to_string(),
                status: Some(status),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            2,
        )
        .expect("status update");
    }

    #[test]
    fn xrp_swap_create_roundtrip() {
        let (mut map, _mm) = setup();
        let tx = create_xrp_swap(&mut map, "swap-1", XRP_SOURCE).expect("create");
        assert_eq!(tx.status, ActiveUserTransactionStatus::Pending);

        let listed = list(&map, principal()).transactions;
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].data, xrp_swap_data(25_000_000, Some(XRP_SOURCE)));
    }

    #[test]
    fn xrp_swap_without_source_address_rejected() {
        // Without the address the in-flight check cannot count the deposit, and
        // a second payment from the same address would pass it.
        let (mut map, _mm) = setup();
        let mut req = create_req("swap-1");
        req.data = xrp_swap_data(25_000_000, None);
        req.external_refs = xrp_refs();
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData(
                "source_address is required for a native XRP source".to_string()
            )
        );
    }

    #[test]
    fn xrp_swap_malformed_source_address_rejected() {
        // The same shape check as a send's `source_address`, since the in-flight
        // check compares the two.
        for (source, expected) in [
            ("r", "source_address invalid length"),
            (
                "xBNLHADLTBV5WqQ8rDyLaTrGXMxrjfzoMi",
                "source_address must start with r",
            ),
            (
                "rBNLHADLTBV5WqQ8rDyLaTrGXMxrjfzoM0",
                "source_address must be base58",
            ),
        ] {
            let (mut map, _mm) = setup();
            let err = create_xrp_swap(&mut map, "swap-1", source).unwrap_err();
            assert_eq!(
                err,
                ActiveUserTransactionError::InvalidData(expected.to_string())
            );
        }
    }

    #[test]
    fn source_address_rejected_for_a_non_xrp_swap_source() {
        // Only a native XRP source pays its deposit from an XRP address. A swap
        // toward XRP makes no XRP payment either, so it carries no address.
        for (source_token, dest_token) in [
            (TokenId::EvmNative(1), TokenId::XrpNativeMainnet),
            (TokenId::BtcNativeMainnet, TokenId::EvmNative(1)),
        ] {
            let (mut map, _mm) = setup();
            let mut req = create_req("swap-1");
            req.data = ActiveUserTransactionData::NearIntents(NearIntentsData {
                source_token,
                dest_token,
                amount: Nat::from(250_000u64),
                source_address: Some(XRP_SOURCE.to_string()),
            });
            let err = create(&mut map, principal(), req, 1).unwrap_err();
            assert_eq!(
                err,
                ActiveUserTransactionError::InvalidData(
                    "source_address is only allowed for a native XRP source".to_string()
                )
            );
        }
    }

    #[test]
    fn swap_toward_xrp_needs_no_address_or_poll_keys() {
        // The payout arrives at the user's address; nothing is paid from it.
        let (mut map, _mm) = setup();
        let mut req = create_req("swap-1");
        req.data = ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::EvmNative(1),
            dest_token: TokenId::XrpNativeMainnet,
            amount: Nat::from(250_000u64),
            source_address: None,
        });
        create(&mut map, principal(), req, 1).expect("create");
    }

    #[test]
    fn xrp_swap_without_poll_keys_rejected() {
        // A `Pending` swap row refuses every later payment from its address until
        // its deposit resolves, so, like a send row, it must be pollable.
        let (mut map, _mm) = setup();
        let mut req = create_req("swap-1");
        req.data = xrp_swap_data(25_000_000, Some(XRP_SOURCE));
        req.external_refs = xrp_refs_without(XRP_REF_TX_HASH);
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData("tx_hash is required".to_string())
        );
    }

    #[test]
    fn xrp_swap_update_cannot_strip_the_poll_keys() {
        let (mut map, _mm) = setup();
        create_xrp_swap(&mut map, "swap-1", XRP_SOURCE).expect("create");

        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "swap-1".to_string(),
                status: None,
                progress_step: None,
                external_refs: Some(xrp_refs_without(XRP_REF_LAST_LEDGER_SEQUENCE)),
                error: None,
            },
            2,
        )
        .unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData("last_ledger_sequence is required".to_string())
        );
    }

    #[test]
    fn xrp_swap_rejected_while_a_send_is_in_flight() {
        for status in [
            ActiveUserTransactionStatus::Pending,
            ActiveUserTransactionStatus::Executing,
        ] {
            let (mut map, _mm) = setup();
            create_xrp_send(&mut map, "xrp-1", XRP_SOURCE);
            if status != ActiveUserTransactionStatus::Pending {
                set_status(&mut map, "xrp-1", status);
            }

            let err = create_xrp_swap(&mut map, "swap-1", XRP_SOURCE).unwrap_err();
            assert_eq!(err, ActiveUserTransactionError::AlreadyInFlight);
        }
    }

    #[test]
    fn xrp_payment_rejected_while_a_swap_deposit_is_in_flight() {
        // A `Pending` swap row is a deposit that has not resolved on the ledger,
        // so it refuses a send and a second swap from the same address alike.
        let (mut map, _mm) = setup();
        create_xrp_swap(&mut map, "swap-1", XRP_SOURCE).expect("first swap");

        let mut send = create_req("xrp-1");
        send.data = xrp_data(25_000_000, 12, None, XRP_SOURCE, XRP_DESTINATION);
        send.external_refs = xrp_refs();
        let err = create(&mut map, principal(), send, 2).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::AlreadyInFlight);

        let err = create_xrp_swap(&mut map, "swap-2", XRP_SOURCE).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::AlreadyInFlight);
    }

    #[test]
    fn xrp_payment_allowed_once_the_swap_deposit_has_resolved() {
        // `Executing` means the deposit validated and the swap goes on at 1Click;
        // the address is free even though the swap row is still open.
        for status in [
            ActiveUserTransactionStatus::Executing,
            ActiveUserTransactionStatus::Succeeded,
            ActiveUserTransactionStatus::Failed,
        ] {
            let (mut map, _mm) = setup();
            create_xrp_swap(&mut map, "swap-1", XRP_SOURCE).expect("first swap");
            set_status(&mut map, "swap-1", status);

            create_xrp_send(&mut map, "xrp-1", XRP_SOURCE);
        }
    }

    #[test]
    fn xrp_swap_deposit_does_not_block_another_address() {
        let (mut map, _mm) = setup();
        create_xrp_swap(&mut map, "swap-1", XRP_SOURCE).expect("first swap");

        create_xrp_send(&mut map, "xrp-1", XRP_OTHER_SOURCE);
    }

    #[test]
    fn swap_toward_xrp_does_not_block_a_payment() {
        let (mut map, _mm) = setup();
        let mut req = create_req("swap-1");
        req.data = ActiveUserTransactionData::NearIntents(NearIntentsData {
            source_token: TokenId::EvmNative(1),
            dest_token: TokenId::XrpNativeMainnet,
            amount: Nat::from(250_000u64),
            source_address: None,
        });
        create(&mut map, principal(), req, 1).expect("swap toward XRP");

        create_xrp_send(&mut map, "xrp-1", XRP_SOURCE);
    }

    #[test]
    fn evm_to_icp_rejects_anonymous_recipient() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.data = ActiveUserTransactionData::OneSecEvmToIcp(OneSecEvmToIcpData {
            source_token: TokenId::EvmNative(1),
            dest_token: TokenId::IcpNative,
            amount: Nat::from(1u32),
            recipient_principal: Principal::anonymous(),
        });

        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert_eq!(
            err,
            ActiveUserTransactionError::InvalidData(
                "recipient_principal must not be anonymous".to_string()
            )
        );
    }

    #[test]
    fn duplicate_external_ref_key_rejected() {
        let (mut map, _mm) = setup();
        let mut req = create_req("id-1");
        req.external_refs = vec![
            ActiveUserTransactionRef {
                key: "tx_hash".to_string(),
                value: "a".to_string(),
            },
            ActiveUserTransactionRef {
                key: "tx_hash".to_string(),
                value: "b".to_string(),
            },
        ];
        let err = create(&mut map, principal(), req, 1).unwrap_err();
        assert!(matches!(err, ActiveUserTransactionError::InvalidData(_)));
    }

    #[test]
    fn duplicate_id_at_cap_returns_already_exists() {
        let (mut map, _mm) = setup();
        for i in 0..MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
            create(&mut map, principal(), create_req(&format!("id-{i}")), 1).expect("within cap");
        }
        // Idempotent retry of an existing id, even at the cap, must surface
        // AlreadyExists rather than TooManyActiveTransactions.
        let err = create(&mut map, principal(), create_req("id-0"), 2).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::AlreadyExists);
    }

    #[test]
    fn per_user_cap_enforced() {
        let (mut map, _mm) = setup();
        for i in 0..MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
            create(&mut map, principal(), create_req(&format!("id-{i}")), 1).expect("within cap");
        }
        let err = create(&mut map, principal(), create_req("overflow"), 1).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::TooManyActiveTransactions);

        // Other principals are unaffected.
        create(&mut map, other_principal(), create_req("id-1"), 1)
            .expect("other principal not throttled");
    }

    #[test]
    fn cap_counts_terminal_rows() {
        let (mut map, _mm) = setup();
        for i in 0..MAX_ACTIVE_USER_TRANSACTIONS_PER_USER {
            let id = format!("id-{i}");
            create(&mut map, principal(), create_req(&id), 1).expect("within cap");
            update(
                &mut map,
                principal(),
                UpdateActiveUserTransactionRequest {
                    id,
                    status: Some(ActiveUserTransactionStatus::Succeeded),
                    progress_step: None,
                    external_refs: None,
                    error: None,
                },
                2,
            )
            .expect("succeed");
        }
        let err = create(&mut map, principal(), create_req("overflow"), 3).unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::TooManyActiveTransactions);

        // FE acknowledges one row, freeing a slot.
        delete(&mut map, principal(), "id-0".to_string()).expect("delete");
        create(&mut map, principal(), create_req("after-delete"), 4)
            .expect("slot freed after delete");
    }

    #[test]
    fn update_partial_fields() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("id-1"), 1).expect("create");

        let updated = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "id-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Executing),
                progress_step: Some("submitting".to_string()),
                external_refs: Some(vec![ActiveUserTransactionRef {
                    key: "tx_hash".to_string(),
                    value: "0xabc".to_string(),
                }]),
                error: None,
            },
            5,
        )
        .expect("update");

        assert_eq!(updated.status, ActiveUserTransactionStatus::Executing);
        assert_eq!(updated.progress_step.as_deref(), Some("submitting"));
        assert_eq!(updated.external_refs.len(), 1);
        assert_eq!(updated.updated_at_ns, 5);
        assert_eq!(updated.created_at_ns, 1);
    }

    #[test]
    fn illegal_transition_rejected() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("id-1"), 1).expect("create");
        update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "id-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            2,
        )
        .expect("Pending -> Succeeded allowed");

        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "id-1".to_string(),
                status: Some(ActiveUserTransactionStatus::Executing),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            3,
        )
        .unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::IllegalStatusTransition);
    }

    #[test]
    fn update_missing_with_invalid_payload_returns_not_found() {
        let (mut map, _mm) = setup();
        // Payload would fail semantic validation, but existence check must
        // run first so the caller sees `NotFound`, not `InvalidData`.
        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "missing".to_string(),
                status: None,
                progress_step: Some("x".repeat(1024)),
                external_refs: None,
                error: None,
            },
            1,
        )
        .unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::NotFound);
    }

    #[test]
    fn update_missing_rejected() {
        let (mut map, _mm) = setup();
        let err = update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "missing".to_string(),
                status: None,
                progress_step: None,
                external_refs: None,
                error: None,
            },
            1,
        )
        .unwrap_err();
        assert_eq!(err, ActiveUserTransactionError::NotFound);
    }

    #[test]
    fn list_returns_all_statuses() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("a");
        create(&mut map, principal(), create_req("b"), 1).expect("b");
        update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "b".to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            2,
        )
        .expect("update b");

        let all = list(&map, principal()).transactions;
        let mut ids: Vec<String> = all.iter().map(|tx| tx.id.clone()).collect();
        ids.sort();
        assert_eq!(ids, vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn list_is_principal_scoped() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("a");
        create(&mut map, other_principal(), create_req("a"), 1).expect("other");

        let mine = list(&map, principal()).transactions;
        assert_eq!(mine.len(), 1);

        let theirs = list(&map, other_principal()).transactions;
        assert_eq!(theirs.len(), 1);
    }

    #[test]
    fn delete_is_idempotent() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("create");
        delete(&mut map, principal(), "a".to_string()).expect("first delete");
        delete(&mut map, principal(), "a".to_string()).expect("second delete idempotent");
        assert!(list(&map, principal()).transactions.is_empty());
    }

    #[test]
    fn terminal_records_are_retained_until_deleted() {
        let (mut map, _mm) = setup();
        create(&mut map, principal(), create_req("a"), 1).expect("create");
        update(
            &mut map,
            principal(),
            UpdateActiveUserTransactionRequest {
                id: "a".to_string(),
                status: Some(ActiveUserTransactionStatus::Succeeded),
                progress_step: None,
                external_refs: None,
                error: None,
            },
            10,
        )
        .expect("succeed");

        // No matter how far in the future we read, the terminal record stays
        // until the FE explicitly deletes it.
        let far_future = 10u64 + 30 * 24 * 60 * 60 * 1_000_000_000;
        let res = list(&map, principal()).transactions;
        assert_eq!(res.len(), 1, "terminal entry must be retained");

        create(&mut map, principal(), create_req("b"), far_future).expect("create b");
        let after_write: Vec<String> = {
            let mut ids: Vec<String> = list(&map, principal())
                .transactions
                .into_iter()
                .map(|tx| tx.id)
                .collect();
            ids.sort();
            ids
        };
        assert_eq!(after_write, vec!["a".to_string(), "b".to_string()]);
    }
}
