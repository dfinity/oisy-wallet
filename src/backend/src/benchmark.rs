#[cfg(feature = "canbench-rs")]
mod benches {
    use canbench_rs::bench;
    use ic_cdk::api::management_canister::bitcoin::{Outpoint, Utxo};

    use super::*;

    #[bench(raw)]
    fn btc_add_pending_transaction_bench() -> canbench_rs::BenchResult {
        let principal =
            Principal::from_text("7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe")
                .unwrap();
        let address = "bc1qbench000000000000000000000000000000000".to_string();

        let make_utxo = |txid_byte: u8, vout: u32, value: u64| Utxo {
            outpoint: Outpoint {
                txid: vec![txid_byte; 32],
                vout,
            },
            value,
            height: 100,
        };

        let existing_utxos: Vec<Utxo> = (0u8..5).map(|i| make_utxo(i, 0, 10_000)).collect();

        mutate_state(|state| {
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            for (i, utxo) in existing_utxos.iter().enumerate().take(3) {
                let tx = StoredPendingTransaction {
                    txid: vec![i as u8; 32],
                    utxos: vec![utxo.clone()],
                    created_at_timestamp_ns: 1_000_000_000,
                };
                model
                    .add_pending_transaction(principal, address.clone(), tx)
                    .unwrap();
            }
        });

        let new_utxos = vec![make_utxo(10, 0, 50_000), make_utxo(11, 0, 30_000)];
        let current_utxos: Vec<Utxo> = existing_utxos
            .iter()
            .chain(new_utxos.iter())
            .cloned()
            .collect();
        let now_ns: u64 = 1_000_000_000 + 100;
        let txid = vec![0xFF; 32];

        canbench_rs::bench_fn(|| {
            let unique_keys: HashSet<(&[u8], u32)> = new_utxos
                .iter()
                .map(|u| (u.outpoint.txid.as_slice(), u.outpoint.vout))
                .collect();
            assert_eq!(unique_keys.len(), new_utxos.len(), "duplicate utxos");

            mutate_state(|state| {
                let mut model = BtcUserPendingTransactionsModel::new(
                    &mut state.btc_user_pending_transactions,
                    None,
                    None,
                );
                model.prune_pending_transactions(principal, &current_utxos, now_ns);

                assert!(
                    !model.has_intersecting_pending_utxos(principal, &new_utxos),
                    "unexpected intersection"
                );

                let pending = StoredPendingTransaction {
                    txid: txid.clone(),
                    utxos: new_utxos.clone(),
                    created_at_timestamp_ns: now_ns,
                };
                model
                    .add_pending_transaction(principal, address.clone(), pending)
                    .unwrap();
            });
        })
    }
}
