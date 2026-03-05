use std::collections::HashSet;

use shared::types::eth_transaction::{
    EthTransactionError, GetEthTransactionsRequest, GetEthTransactionsResponse, RegisteredAddress,
    StoredEthTransaction, UserEthTransactionsData,
};

use crate::{
    state::{mutate_state, read_state},
    transactions::providers,
    types::{Candid, StoredPrincipal},
    user_profile::activity,
};

const DEFAULT_PAGE_LIMIT: u64 = 50;
const MAX_PAGE_LIMIT: u64 = 200;

// ---------------------------------------------------------------------------
// Address registration
// ---------------------------------------------------------------------------

pub(crate) fn register_address(
    principal: StoredPrincipal,
    address: String,
    chain_id: u64,
) -> Result<(), EthTransactionError> {
    mutate_state(|s| {
        let mut data = s
            .eth_transactions
            .get(&principal)
            .map(|c| c.0.clone())
            .unwrap_or_default();

        let already_registered = data
            .addresses
            .iter()
            .any(|a| a.address == address && a.chain_id == chain_id);

        if already_registered {
            return Err(EthTransactionError::AddressAlreadyRegistered);
        }

        data.addresses.push(RegisteredAddress { address, chain_id });

        s.eth_transactions.insert(principal, Candid(data));
        Ok(())
    })
}

// ---------------------------------------------------------------------------
// Paginated transaction retrieval
// ---------------------------------------------------------------------------

#[expect(clippy::cast_possible_truncation)]
pub(crate) fn get_transactions(
    principal: StoredPrincipal,
    request: &GetEthTransactionsRequest,
) -> Result<GetEthTransactionsResponse, EthTransactionError> {
    read_state(|s| {
        let data = s
            .eth_transactions
            .get(&principal)
            .ok_or(EthTransactionError::NoAddressesRegistered)?;

        let offset = request.cursor.unwrap_or(0) as usize;
        let limit = request
            .limit
            .unwrap_or(DEFAULT_PAGE_LIMIT)
            .min(MAX_PAGE_LIMIT) as usize;

        let total = data.transactions.len();
        let end = (offset + limit).min(total);

        let transactions: Vec<StoredEthTransaction> = if offset < total {
            data.transactions[offset..end].to_vec()
        } else {
            vec![]
        };

        let next_cursor = if end < total { Some(end as u64) } else { None };

        Ok(GetEthTransactionsResponse {
            transactions,
            next_cursor,
        })
    })
}

// ---------------------------------------------------------------------------
// Refresh transactions for a single user
// ---------------------------------------------------------------------------

pub(crate) async fn refresh_transactions_for_user(principal: StoredPrincipal) {
    let Some(api_key) = providers::get_api_key("etherscan") else {
        return;
    };

    let user_data: Option<UserEthTransactionsData> =
        read_state(|s| s.eth_transactions.get(&principal).map(|c| c.0.clone()));

    let Some(data) = user_data.filter(|d| !d.addresses.is_empty()) else {
        return;
    };

    for addr_entry in &data.addresses {
        let fetch_key = format!("{}_{}", addr_entry.chain_id, addr_entry.address);
        let start_block = data
            .last_fetched_blocks
            .get(&fetch_key)
            .copied()
            .unwrap_or(0);

        match providers::etherscan::fetch_all_transactions(
            &addr_entry.address,
            addr_entry.chain_id,
            start_block,
            &api_key,
        )
        .await
        {
            Ok(new_txs) if new_txs.is_empty() => {}
            Ok(new_txs) => {
                merge_transactions(principal, &fetch_key, new_txs);
            }
            Err(_e) => {}
        }
    }
}

/// Merges newly fetched transactions into the user's stored data,
/// deduplicating by hash+type and updating the last fetched block.
fn merge_transactions(
    principal: StoredPrincipal,
    fetch_key: &str,
    new_txs: Vec<StoredEthTransaction>,
) {
    mutate_state(|s| {
        let mut data = s
            .eth_transactions
            .get(&principal)
            .map(|c| c.0.clone())
            .unwrap_or_default();

        let existing_hashes: HashSet<String> = data.transactions.iter().map(dedup_key).collect();

        let mut max_block: u64 = data
            .last_fetched_blocks
            .get(fetch_key)
            .copied()
            .unwrap_or(0);

        for tx in new_txs {
            if let Ok(bn) = tx.block_number().parse::<u64>() {
                if bn > max_block {
                    max_block = bn;
                }
            }

            let key = dedup_key(&tx);
            if !existing_hashes.contains(&key) {
                data.transactions.push(tx);
            }
        }

        data.transactions.sort_by(|a, b| {
            let ba = a.block_number().parse::<u64>().unwrap_or(0);
            let bb = b.block_number().parse::<u64>().unwrap_or(0);
            bb.cmp(&ba).then_with(|| {
                let ta = a.time_stamp().parse::<u64>().unwrap_or(0);
                let tb = b.time_stamp().parse::<u64>().unwrap_or(0);
                tb.cmp(&ta)
            })
        });

        data.last_fetched_blocks
            .insert(fetch_key.to_string(), max_block);

        s.eth_transactions.insert(principal, Candid(data));
    });
}

fn dedup_key(tx: &StoredEthTransaction) -> String {
    let variant = match tx {
        StoredEthTransaction::Normal(_) => "normal",
        StoredEthTransaction::Internal(_) => "internal",
        StoredEthTransaction::Erc20(_) => "erc20",
        StoredEthTransaction::Erc721(_) => "erc721",
        StoredEthTransaction::Erc1155(_) => "erc1155",
    };
    format!("{variant}:{}", tx.hash())
}

/// Returns all principals that have registered ETH addresses and are currently active.
pub(crate) fn active_users_with_addresses() -> Vec<StoredPrincipal> {
    read_state(|s| {
        s.eth_transactions
            .iter()
            .filter_map(|entry| {
                let principal = *entry.key();
                let data = entry.value();
                if data.addresses.is_empty() {
                    return None;
                }
                if !activity::is_user_active(principal) {
                    return None;
                }
                Some(principal)
            })
            .collect()
    })
}
