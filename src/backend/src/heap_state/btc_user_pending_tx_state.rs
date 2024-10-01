use candid::Principal;
use ic_cdk::api::management_canister::bitcoin::Utxo;
use std::collections::HashMap;

const MAX_PENDING_TRANSACTIONS: usize = 1000;
#[allow(dead_code)]
const DAY_IN_NS: u64 = 24 * 60 * 60 * 1_000_000_000;

#[derive(Clone, PartialEq, Eq, Debug)]
pub struct StoredPendingTransaction {
    txid: Vec<u8>,
    utxos: Vec<Utxo>,
    created_at_timestamp_ns: u64,
}

#[allow(dead_code)]
pub struct BtcUserPendingTransactions {
    pending_transactions_map: HashMap<Principal, Vec<StoredPendingTransaction>>,
    max_pending_transactions: usize,
}

impl BtcUserPendingTransactions {
    pub fn new(max_pending_txs: Option<usize>) -> Self {
        Self {
            pending_transactions_map: HashMap::new(),
            max_pending_transactions: max_pending_txs.unwrap_or(MAX_PENDING_TRANSACTIONS),
        }
    }

    #[allow(dead_code)]
    pub fn get_pending_transactions(
        &self,
        principal: &Principal,
    ) -> &Vec<StoredPendingTransaction> {
        static EMPTY_VEC: Vec<StoredPendingTransaction> = Vec::new();
        self.pending_transactions_map
            .get(principal)
            .unwrap_or(&EMPTY_VEC)
    }

    #[allow(dead_code)]
    pub fn add_pending_transaction(
        &mut self,
        principal: Principal,
        new_transaction: StoredPendingTransaction,
    ) -> Result<(), String> {
        if let Some(list) = self.pending_transactions_map.get_mut(&principal) {
            if list.len() >= self.max_pending_transactions {
                return Err("Maximum pending transactions reached".to_string());
            }
            list.push(new_transaction);
        } else {
            let list: Vec<StoredPendingTransaction> = vec![new_transaction];
            self.pending_transactions_map.insert(principal, list);
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn prune_pending_transactions(
        &mut self,
        principal: Principal,
        utxos: &[Utxo],
        now_ns: u64,
    ) {
        if let Some(list) = self.pending_transactions_map.get(&principal) {
            let pruned_list: Vec<StoredPendingTransaction> = list
                .clone()
                .into_iter()
                .filter(|pending_transaction| {
                    // We assume that if a pending transaction has been pending for longer than a day, it has been rejected.
                    let is_old = pending_transaction.created_at_timestamp_ns + DAY_IN_NS < now_ns;
                    let utxo_found = pending_transaction
                        .utxos
                        .iter()
                        .find(|utxo| utxos.contains(utxo));
                    !is_old && utxo_found.is_none()
                })
                .collect();
            self.pending_transactions_map.insert(principal, pruned_list);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ic_cdk::api::management_canister::bitcoin::Outpoint;

    const UTXO_1: Utxo = Utxo {
        outpoint: Outpoint {
            txid: vec![],
            vout: 0,
        },
        value: 1000,
        height: 100,
    };
    const UTXO_2: Utxo = Utxo {
        outpoint: Outpoint {
            txid: vec![],
            vout: 1,
        },
        value: 2000,
        height: 120,
    };
    const UTXO_3: Utxo = Utxo {
        outpoint: Outpoint {
            txid: vec![],
            vout: 2,
        },
        value: 3000,
        height: 150,
    };
    const UTXO_4: Utxo = Utxo {
        outpoint: Outpoint {
            txid: vec![],
            vout: 2,
        },
        value: 8000,
        height: 160,
    };

    const PRINCIPAL_TEXT_1: &str =
        "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";
    const PRINCIPAL_TEXT_2: &str =
        "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae";

    #[test]
    fn test_get_pending_transactions_empty() {
        let btc_user_pending_transactions = BtcUserPendingTransactions::new(None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let pending_txs = btc_user_pending_transactions.get_pending_transactions(&principal);
        assert!(pending_txs.is_empty());
    }

    #[test]
    fn test_add_pending_transaction() {
        let mut btc_user_pending_transactions = BtcUserPendingTransactions::new(None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();
        let tx = StoredPendingTransaction {
            txid: vec![],
            utxos: vec![UTXO_1],
            created_at_timestamp_ns: 1_000_000,
        };

        // Add the pending transaction
        let result =
            btc_user_pending_transactions.add_pending_transaction(principal.clone(), tx.clone());
        assert!(result.is_ok());

        // Check that the transaction was added
        let pending_txs = btc_user_pending_transactions.get_pending_transactions(&principal);
        assert_eq!(pending_txs.len(), 1);
        assert_eq!(pending_txs[0], tx);
    }

    #[test]
    fn test_add_pending_transaction_does_not_add_other_principal() {
        let mut btc_user_pending_transactions = BtcUserPendingTransactions::new(None);
        let principal1 = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();
        let principal2 = Principal::from_text(PRINCIPAL_TEXT_2).unwrap();
        let tx = StoredPendingTransaction {
            txid: vec![],
            utxos: vec![UTXO_1],
            created_at_timestamp_ns: 1_000_000,
        };

        let result =
            btc_user_pending_transactions.add_pending_transaction(principal1.clone(), tx.clone());
        assert!(result.is_ok());

        let pending_txs = btc_user_pending_transactions.get_pending_transactions(&principal2);
        assert!(pending_txs.is_empty());
    }

    // Test for add_pending_transaction when MAX_PENDING_TRANSACTIONS is reached
    #[test]
    fn test_add_pending_transaction_max_limit() {
        let mut btc_user_pending_transactions = BtcUserPendingTransactions::new(Some(3));
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let tx1 = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![UTXO_1],
            created_at_timestamp_ns: 1_000_000,
        };
        let tx2 = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![UTXO_2],
            created_at_timestamp_ns: 2_000_000,
        };
        let tx3 = StoredPendingTransaction {
            txid: vec![7, 8, 9],
            utxos: vec![UTXO_3],
            created_at_timestamp_ns: 3_000_000,
        };
        let tx4 = StoredPendingTransaction {
            txid: vec![10, 11, 12],
            utxos: vec![UTXO_4],
            created_at_timestamp_ns: 4_000_000,
        };

        // Add 3 transactions (MAX_PENDING_TRANSACTIONS = 3)
        btc_user_pending_transactions
            .add_pending_transaction(principal.clone(), tx1)
            .unwrap();
        btc_user_pending_transactions
            .add_pending_transaction(principal.clone(), tx2)
            .unwrap();
        btc_user_pending_transactions
            .add_pending_transaction(principal.clone(), tx3)
            .unwrap();

        // Try adding a 4th transaction and expect an error
        let result = btc_user_pending_transactions.add_pending_transaction(principal.clone(), tx4);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Maximum pending transactions reached");
    }

    // Test pruning of old transactions
    #[test]
    fn test_prune_pending_transactions() {
        let mut btc_user_pending_transactions = BtcUserPendingTransactions::new(None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let yesterday_ns = 1_000_000;
        let now_ns = yesterday_ns + DAY_IN_NS;

        let old_transaction = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![UTXO_1],
            created_at_timestamp_ns: yesterday_ns,
        };
        btc_user_pending_transactions
            .add_pending_transaction(principal.clone(), old_transaction.clone())
            .unwrap();

        let valid_transaction = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![UTXO_2],
            created_at_timestamp_ns: now_ns,
        };
        btc_user_pending_transactions
            .add_pending_transaction(principal.clone(), valid_transaction.clone())
            .unwrap();

        let pending_txs = btc_user_pending_transactions.get_pending_transactions(&principal);
        assert_eq!(pending_txs.len(), 2);

        btc_user_pending_transactions.prune_pending_transactions(
            principal.clone(),
            &[],
            now_ns + 1,
        );

        let pending_txs = btc_user_pending_transactions.get_pending_transactions(&principal);
        assert_eq!(pending_txs.len(), 1);
        assert_eq!(pending_txs[0], valid_transaction);
    }

    #[test]
    fn test_prune_with_matching_utxos() {
        let mut btc_user_pending_transactions = BtcUserPendingTransactions::new(None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let now_ns = 1_000_000_000_000;

        let transaction_1 = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![UTXO_1],
            created_at_timestamp_ns: now_ns,
        };
        let transaction_2 = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![UTXO_2],
            created_at_timestamp_ns: now_ns,
        };

        btc_user_pending_transactions
            .add_pending_transaction(principal.clone(), transaction_1.clone())
            .unwrap();
        btc_user_pending_transactions
            .add_pending_transaction(principal.clone(), transaction_2.clone())
            .unwrap();

        let pending_txs = btc_user_pending_transactions.get_pending_transactions(&principal);
        assert_eq!(pending_txs.len(), 2);

        let matching_utxos = &[UTXO_1];
        btc_user_pending_transactions.prune_pending_transactions(
            principal.clone(),
            matching_utxos,
            now_ns,
        );

        let pending_txs = btc_user_pending_transactions.get_pending_transactions(&principal);
        assert_eq!(pending_txs.len(), 1);
        assert_eq!(pending_txs[0], transaction_2);
    }
}
