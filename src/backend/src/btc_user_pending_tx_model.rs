use std::collections::HashSet;

use candid::Principal;
use ic_cdk::api::management_canister::bitcoin::Utxo;

#[allow(dead_code)]
const MAX_PENDING_TRANSACTIONS: usize = 1000;
#[allow(dead_code)]
const MAX_ADDRESS_COUNT_PER_USER: usize = 20;
#[allow(dead_code)]
const HOUR_IN_NS: u64 = 60 * 60 * 1_000_000_000;

use shared::types::bitcoin::StoredPendingTransaction;

// With this structure, if multiple users share the same address
// they wouldn't share the pending transactions.
// This is not possible with the current implementation of the addresses in CFS.
// But something to have in mind for the future.
use crate::types::{BtcUserPendingTransactionsMap, Candid, StoredPrincipal};

#[allow(dead_code)]
pub struct BtcUserPendingTransactionsModel<'a> {
    /// Map of `user_principal` to `PendingTransactionsMap`;
    pending_transactions_map: &'a mut BtcUserPendingTransactionsMap,
    /// Maximum number of transactions that will be stored per `(principal, address)` tuple.
    max_pending_transactions: usize,
    /// Maximum number of addresses per user.
    max_addresses_per_user: usize,
}

impl<'a> BtcUserPendingTransactionsModel<'a> {
    #[allow(dead_code)]
    pub fn new(
        pending_transactions_map: &'a mut BtcUserPendingTransactionsMap,
        max_pending_txs: Option<usize>,
        max_addresses_per_user: Option<usize>,
    ) -> Self {
        Self {
            pending_transactions_map,
            max_pending_transactions: max_pending_txs.unwrap_or(MAX_PENDING_TRANSACTIONS),
            max_addresses_per_user: max_addresses_per_user.unwrap_or(MAX_ADDRESS_COUNT_PER_USER),
        }
    }

    /// Returns the pending transactions of a specific principal per address.
    #[allow(dead_code)]
    pub fn get_pending_transactions(
        &self,
        principal: &Principal,
        address: &str,
    ) -> Vec<StoredPendingTransaction> {
        let stored_principal = StoredPrincipal(*principal);
        self.pending_transactions_map
            .get(&stored_principal)
            .and_then(|map| map.0.get(address).cloned())
            .unwrap_or_default()
    }

    /// Adds a pending transaction for a specific principal and address.
    /// It has a limit of storable transactions set on init.
    #[allow(dead_code)]
    pub fn add_pending_transaction(
        &mut self,
        principal: Principal,
        address: String,
        new_transaction: StoredPendingTransaction,
    ) -> Result<(), String> {
        let stored_principal = StoredPrincipal(principal);
        let mut address_map = self
            .pending_transactions_map
            .get(&stored_principal)
            .map(|c| c.0)
            .unwrap_or_default();

        if let Some(list) = address_map.get_mut(&address) {
            if list.len() >= self.max_pending_transactions {
                return Err("Maximum pending transactions reached".to_string());
            }
            list.push(new_transaction);
        } else {
            if address_map.keys().len() >= self.max_addresses_per_user {
                return Err("Maximum address per user reached".to_string());
            }
            let list: Vec<StoredPendingTransaction> = vec![new_transaction];
            address_map.insert(address, list);
        }

        self.pending_transactions_map
            .insert(stored_principal, Candid(address_map));
        Ok(())
    }

    /// Prunes pending transactions for a specific principal.
    /// A pending transaction can be pruned for two reasons:
    /// - Transaction is older than 1 hour. We consider that if a pending transaction is older than
    ///   one hour it means it failed and we can free to utxos to be used again.
    /// - None of the transaction's utxos are present in the current utxos list. We use the pending
    ///   transactions to avoid double spending. Once we know that a utxos is not available, we can
    ///   remove the pending transaction. Normally, all utxos of a pending transaction should be
    ///   present or not. Partial presence could happen if the utxos of a pending transaction were
    ///   not really used in the transaction. We don't remove in partial presence because, in the
    ///   end, partial presence will be temporary for one hour.
    #[allow(dead_code)]
    pub fn prune_pending_transactions(
        &mut self,
        principal: Principal,
        current_utxos: &[Utxo],
        now_ns: u64,
    ) {
        let stored_principal = StoredPrincipal(principal);
        let Some(mut address_map) = self
            .pending_transactions_map
            .get(&stored_principal)
            .map(|c| c.0)
        else {
            return;
        };

        let mut changed = false;
        let mut addresses_to_remove = Vec::new();
        for (address, transactions) in &mut address_map {
            let initial_len = transactions.len();
            transactions.retain(|pending_transaction| {
                let is_old = pending_transaction.created_at_timestamp_ns + HOUR_IN_NS < now_ns;

                let none_of_tx_utxos_are_still_present = pending_transaction
                    .utxos
                    .iter()
                    .all(|utxo| !current_utxos.contains(utxo));

                !is_old && !none_of_tx_utxos_are_still_present
            });

            if transactions.len() != initial_len {
                changed = true;
            }

            if transactions.is_empty() {
                addresses_to_remove.push(address.clone());
            }
        }

        for address in &addresses_to_remove {
            address_map.remove(address.as_str());
            changed = true;
        }

        if changed {
            if address_map.is_empty() {
                self.pending_transactions_map.remove(&stored_principal);
            } else {
                self.pending_transactions_map
                    .insert(stored_principal, Candid(address_map));
            }
        }
    }

    /// Checks whether the provided UTXOs intersect with any existing pending
    /// transactions for a specific principal.
    ///
    /// This method is used to prevent double reservation of the same UTXOs.
    /// A conflict occurs if at least one UTXO in `new_utxos` is already present
    /// in the UTXO set of any stored pending transaction for the given principal.
    ///
    /// The check is performed across all addresses associated with the principal.
    /// If the principal has no pending transactions stored, the method returns `false`.
    ///
    /// Returns:
    /// - `true` if there is at least one overlapping UTXO.
    /// - `false` if no overlap is found.
    pub fn has_intersecting_pending_utxos(&self, principal: Principal, new_utxos: &[Utxo]) -> bool {
        let new_keys: HashSet<(&[u8], u32)> = new_utxos
            .iter()
            .map(|u| (u.outpoint.txid.as_slice(), u.outpoint.vout))
            .collect();

        let stored_principal = StoredPrincipal(principal);
        let Some(address_map) = self.pending_transactions_map.get(&stored_principal) else {
            return false;
        };

        address_map
            .0
            .values()
            .flat_map(|txs| txs.iter())
            .flat_map(|tx| tx.utxos.iter())
            .any(|u| new_keys.contains(&(u.outpoint.txid.as_slice(), u.outpoint.vout)))
    }
}

#[cfg(test)]
mod tests {
    use std::{cell::RefCell, collections::HashMap, sync::LazyLock};

    use ic_cdk::api::management_canister::bitcoin::Outpoint;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };

    use super::*;

    const TXID_A: &[u8] = &[0xAA; 32];
    const TXID_B: &[u8] = &[0xBB; 32];
    const TXID_C: &[u8] = &[0xCC; 32];

    const UTXO_1: LazyLock<Utxo> = LazyLock::new(|| Utxo {
        outpoint: Outpoint {
            txid: TXID_A.to_vec(),
            vout: 0,
        },
        value: 1000,
        height: 100,
    });
    const UTXO_2: LazyLock<Utxo> = LazyLock::new(|| Utxo {
        outpoint: Outpoint {
            txid: TXID_A.to_vec(),
            vout: 1,
        },
        value: 2000,
        height: 120,
    });
    const UTXO_3: LazyLock<Utxo> = LazyLock::new(|| Utxo {
        outpoint: Outpoint {
            txid: TXID_B.to_vec(),
            vout: 2,
        },
        value: 3000,
        height: 150,
    });
    const UTXO_4: LazyLock<Utxo> = LazyLock::new(|| Utxo {
        outpoint: Outpoint {
            txid: TXID_B.to_vec(),
            vout: 2,
        },
        value: 8000,
        height: 160,
    });
    const UTXO_5: LazyLock<Utxo> = LazyLock::new(|| Utxo {
        outpoint: Outpoint {
            txid: TXID_C.to_vec(),
            vout: 9,
        },
        value: 9000,
        height: 200,
    });

    const PRINCIPAL_TEXT_1: &str =
        "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";
    const PRINCIPAL_TEXT_2: &str =
        "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae";
    const ADDRESS_1: &str = "test-address-1";
    const ADDRESS_2: &str = "test-address-2";
    const ADDRESS_3: &str = "test-address-3";
    const ADDRESS_4: &str = "test-address-4";

    fn setup() -> (
        BtcUserPendingTransactionsMap,
        RefCell<MemoryManager<DefaultMemoryImpl>>,
    ) {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map =
            BtcUserPendingTransactionsMap::init(memory_manager.borrow().get(MemoryId::new(0)));
        (map, memory_manager)
    }

    #[test]
    fn test_get_pending_transactions_empty() {
        let (mut map, _mm) = setup();
        let model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert!(pending_txs.is_empty());
    }

    #[test]
    fn test_add_pending_transaction_per_address() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();
        let tx = StoredPendingTransaction {
            txid: vec![],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_000_000,
        };

        // Add the pending transaction
        let result = model.add_pending_transaction(principal, ADDRESS_1.to_string(), tx.clone());
        assert!(result.is_ok());

        // Check that the transaction was added
        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert_eq!(pending_txs.len(), 1);
        assert_eq!(pending_txs[0], tx);

        // Check that the transaction was added to the proper address
        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_2);
        assert!(pending_txs.is_empty());
    }

    #[test]
    fn test_add_pending_transaction_does_not_add_other_principal() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal1 = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();
        let principal2 = Principal::from_text(PRINCIPAL_TEXT_2).unwrap();
        let tx = StoredPendingTransaction {
            txid: vec![],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_000_000,
        };

        let result = model.add_pending_transaction(principal1, ADDRESS_1.to_string(), tx.clone());
        assert!(result.is_ok());

        let pending_txs = model.get_pending_transactions(&principal2, ADDRESS_1);
        assert!(pending_txs.is_empty());
    }

    // Test for add_pending_transaction when max_pending_transactions is reached
    #[test]
    fn test_add_pending_transaction_max_limit() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, Some(3), None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let tx1 = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_000_000,
        };
        let tx2 = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![(*UTXO_2).clone()],
            created_at_timestamp_ns: 2_000_000,
        };
        let tx3 = StoredPendingTransaction {
            txid: vec![7, 8, 9],
            utxos: vec![(*UTXO_3).clone()],
            created_at_timestamp_ns: 3_000_000,
        };
        let tx4 = StoredPendingTransaction {
            txid: vec![10, 11, 12],
            utxos: vec![(*UTXO_4).clone()],
            created_at_timestamp_ns: 4_000_000,
        };

        // Add 3 transactions (max_pending_transactions = 3)
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), tx1)
            .unwrap();
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), tx2)
            .unwrap();
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), tx3)
            .unwrap();

        // Try adding a 4th transaction and expect an error
        let result = model.add_pending_transaction(principal, ADDRESS_1.to_string(), tx4);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Maximum pending transactions reached");
    }

    // Test for add_pending_transaction when max_addresses_per_user is reached
    #[test]
    fn test_add_pending_transaction_max_address_limit() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, Some(3));
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let tx1 = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_000_000,
        };
        let tx2 = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![(*UTXO_2).clone()],
            created_at_timestamp_ns: 2_000_000,
        };
        let tx3 = StoredPendingTransaction {
            txid: vec![7, 8, 9],
            utxos: vec![(*UTXO_3).clone()],
            created_at_timestamp_ns: 3_000_000,
        };
        let tx4 = StoredPendingTransaction {
            txid: vec![10, 11, 12],
            utxos: vec![(*UTXO_4).clone()],
            created_at_timestamp_ns: 4_000_000,
        };

        // Add 3 transactions (max_addresses_per_user = 3)
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), tx1)
            .unwrap();
        model
            .add_pending_transaction(principal, ADDRESS_2.to_string(), tx2)
            .unwrap();
        model
            .add_pending_transaction(principal, ADDRESS_3.to_string(), tx3)
            .unwrap();

        // Try adding a 4th address and expect an error
        let result = model.add_pending_transaction(principal, ADDRESS_4.to_string(), tx4);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Maximum address per user reached");
    }

    #[test]
    fn test_prune_old_pending_transactions() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let yesterday_ns = 1_000_000;
        let now_ns = yesterday_ns + HOUR_IN_NS;

        let old_transaction = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: yesterday_ns,
        };
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), old_transaction.clone())
            .unwrap();

        let valid_transaction = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![(*UTXO_2).clone()],
            created_at_timestamp_ns: now_ns,
        };
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), valid_transaction.clone())
            .unwrap();

        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert_eq!(pending_txs.len(), 2);

        let all_utxos = &[(*UTXO_1).clone(), (*UTXO_2).clone()];

        model.prune_pending_transactions(principal, all_utxos, now_ns + 1);

        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert_eq!(pending_txs.len(), 1);
        assert_eq!(pending_txs[0], valid_transaction);
    }

    #[test]
    fn test_prune_with_available_utxos() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let now_ns = 1_000_000_000_000;

        let transaction_1 = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: now_ns,
        };
        let transaction_2 = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![(*UTXO_2).clone()],
            created_at_timestamp_ns: now_ns,
        };

        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), transaction_1.clone())
            .unwrap();
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), transaction_2.clone())
            .unwrap();

        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert_eq!(pending_txs.len(), 2);

        let available_utxos = &[(*UTXO_1).clone()];
        model.prune_pending_transactions(principal, available_utxos, now_ns);

        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert_eq!(pending_txs.len(), 1);
        assert_eq!(pending_txs[0], transaction_1);
    }

    #[test]
    fn test_does_not_prune_with_partial_available_utxos() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let now_ns = 1_000_000_000_000;

        let transaction_1 = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: now_ns,
        };
        let transaction_2 = StoredPendingTransaction {
            txid: vec![4, 5, 6],
            utxos: vec![(*UTXO_2).clone(), (*UTXO_3).clone()],
            created_at_timestamp_ns: now_ns,
        };

        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), transaction_1.clone())
            .unwrap();
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), transaction_2.clone())
            .unwrap();

        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert_eq!(pending_txs.len(), 2);

        let available_utxos = &[(*UTXO_1).clone(), (*UTXO_3).clone()];
        model.prune_pending_transactions(principal, available_utxos, now_ns);

        let pending_txs = model.get_pending_transactions(&principal, ADDRESS_1);
        assert_eq!(pending_txs.len(), 2);
    }

    #[test]
    fn test_has_intersecting_pending_utxos_true_across_addresses() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let existing_1 = StoredPendingTransaction {
            txid: vec![1],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_000_000,
        };
        let existing_2 = StoredPendingTransaction {
            txid: vec![2],
            utxos: vec![(*UTXO_2).clone()],
            created_at_timestamp_ns: 1_000_000,
        };

        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), existing_1)
            .unwrap();
        model
            .add_pending_transaction(principal, ADDRESS_2.to_string(), existing_2)
            .unwrap();

        assert!(model.has_intersecting_pending_utxos(principal, &[(*UTXO_2).clone()]));
    }

    #[test]
    fn test_has_intersecting_pending_utxos_false_when_disjoint() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        let existing = StoredPendingTransaction {
            txid: vec![1],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_000_000,
        };

        map.insert(
            StoredPrincipal(principal),
            Candid(HashMap::from([(ADDRESS_1.to_string(), vec![existing])])),
        );

        let model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        assert!(!model.has_intersecting_pending_utxos(principal, &[(*UTXO_5).clone()]));
    }

    #[test]
    fn test_has_intersecting_pending_utxos_false_other_principal() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal_1 = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();
        let principal_2 = Principal::from_text(PRINCIPAL_TEXT_2).unwrap();

        let existing = StoredPendingTransaction {
            txid: vec![1],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_000_000,
        };

        model
            .add_pending_transaction(principal_1, ADDRESS_1.to_string(), existing)
            .unwrap();

        assert!(!model.has_intersecting_pending_utxos(principal_2, &[(*UTXO_1).clone()]));
    }

    #[test]
    fn test_has_intersecting_pending_utxos_false_for_self_duplicates_when_no_pending_exists() {
        let (mut map, _mm) = setup();
        let model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        assert!(!model
            .has_intersecting_pending_utxos(principal, &[(*UTXO_1).clone(), (*UTXO_1).clone()]));
    }

    #[test]
    fn test_has_intersecting_pending_utxos_true_when_second_call_reuses_same_utxos() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        // First call reserves UTXO_1 and UTXO_2
        let first = StoredPendingTransaction {
            txid: vec![1],
            utxos: vec![(*UTXO_1).clone(), (*UTXO_2).clone()],
            created_at_timestamp_ns: 1_000_000,
        };
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), first)
            .unwrap();

        // Second call attempts to reuse the exact same set => must intersect
        assert!(model
            .has_intersecting_pending_utxos(principal, &[(*UTXO_1).clone(), (*UTXO_2).clone()]));
    }

    #[test]
    fn test_has_intersecting_pending_utxos_true_when_second_call_partially_overlaps() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        // First call reserves UTXO_1 and UTXO_2
        let first = StoredPendingTransaction {
            txid: vec![1],
            utxos: vec![(*UTXO_1).clone(), (*UTXO_2).clone()],
            created_at_timestamp_ns: 1_000_000,
        };
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), first)
            .unwrap();

        // Second call overlaps on UTXO_2 only => still must intersect
        assert!(model
            .has_intersecting_pending_utxos(principal, &[(*UTXO_2).clone(), (*UTXO_5).clone()]));
    }

    #[test]
    fn test_has_intersecting_pending_utxos_true_when_overlap_is_same_outpoint_even_if_fields_differ(
    ) {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        // UTXO_3 and UTXO_4 share the same outpoint (txid=[], vout=2) but differ in value/height.
        // If your overlap logic is correct (outpoint-based), this should count as intersection.
        let first = StoredPendingTransaction {
            txid: vec![1],
            utxos: vec![(*UTXO_3).clone()],
            created_at_timestamp_ns: 1_000_000,
        };
        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), first)
            .unwrap();

        assert!(model.has_intersecting_pending_utxos(principal, &[(*UTXO_4).clone()]));
    }

    #[test]
    fn test_has_intersecting_pending_utxos_false_when_vout_matches_but_txid_differs() {
        let (mut map, _mm) = setup();
        let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();

        // Existing pending uses TXID_A, vout=7
        let pending = StoredPendingTransaction {
            txid: vec![1],
            utxos: vec![Utxo {
                outpoint: Outpoint {
                    txid: TXID_A.to_vec(),
                    vout: 7,
                },
                value: 1111,
                height: 1,
            }],
            created_at_timestamp_ns: 1_000_000,
        };

        model
            .add_pending_transaction(principal, ADDRESS_1.to_string(), pending)
            .unwrap();

        // New utxo has same vout=7 but different txid => must NOT intersect
        let candidate = Utxo {
            outpoint: Outpoint {
                txid: TXID_B.to_vec(),
                vout: 7,
            },
            value: 2222,
            height: 2,
        };

        assert!(!model.has_intersecting_pending_utxos(principal, &[candidate]));
    }

    #[test]
    fn test_persistence_across_reinit() {
        let (memory_manager, _map) = {
            let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
            let map =
                BtcUserPendingTransactionsMap::init(memory_manager.borrow().get(MemoryId::new(0)));
            (memory_manager, map)
        };
        let principal = Principal::from_text(PRINCIPAL_TEXT_1).unwrap();
        let address = ADDRESS_1.to_string();
        let tx = StoredPendingTransaction {
            txid: vec![1, 2, 3],
            utxos: vec![(*UTXO_1).clone()],
            created_at_timestamp_ns: 1_234_567,
        };

        {
            let memory = memory_manager.borrow().get(MemoryId::new(0));
            let mut map = BtcUserPendingTransactionsMap::init(memory);
            let mut model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
            model
                .add_pending_transaction(principal, address.clone(), tx.clone())
                .unwrap();
        }

        // Re-init with same memory
        {
            let memory = memory_manager.borrow().get(MemoryId::new(0));
            let mut map = BtcUserPendingTransactionsMap::init(memory);
            let model = BtcUserPendingTransactionsModel::new(&mut map, None, None);
            let pending_txs = model.get_pending_transactions(&principal, &address);
            assert_eq!(pending_txs.len(), 1);
            assert_eq!(pending_txs[0], tx);
        }
    }
}
