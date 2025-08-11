import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import type { UtxoTxidText } from '$icp/types/ckbtc';
import { mockPendingUtxo } from '$tests/mocks/ckbtc.mock';
import type { PendingUtxo } from '@dfinity/ckbtc';
import { get } from 'svelte/store';

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		uint8ArrayToHexString: (v: Uint8Array | number[]) => v
	};
});

describe('ckbtc-utxos.store', () => {
	describe('ckBtcPendingUtxosStore', () => {
		const tokenId = ICP_TOKEN_ID;

		describe('filter', () => {
			const store = ckBtcPendingUtxosStore;

			const utxosIds: UtxoTxidText[] = ['utxo1', 'utxo2', 'utxo3', 'utxo4', 'utxo5'];

			const pendingUtxos: PendingUtxo[] = utxosIds.map((txid) => ({
				...mockPendingUtxo,
				outpoint: { ...mockPendingUtxo.outpoint, txid: txid as unknown as Uint8Array }
			}));

			const filterIds = utxosIds.slice(2, 4);

			const expectedIds = utxosIds.filter((id) => !filterIds.includes(id));

			const expectedPendingUtxos: PendingUtxo[] = expectedIds.map((txid) => ({
				...mockPendingUtxo,
				outpoint: { ...mockPendingUtxo.outpoint, txid: txid as unknown as Uint8Array }
			}));

			beforeEach(() => {
				store.reset(tokenId);
			});

			it('should remove the UTXOs provided as filter', () => {
				store.set({
					id: tokenId,
					data: { data: pendingUtxos, certified: true }
				});

				store.filter({
					tokenId,
					utxosIds: { data: filterIds, certified: true }
				});

				const state = get(store);

				expect(state?.[tokenId]).toStrictEqual({
					data: expectedPendingUtxos,
					certified: true
				});
			});

			it('should handle empty filter', () => {
				store.set({
					id: tokenId,
					data: { data: pendingUtxos, certified: true }
				});

				store.filter({
					tokenId,
					utxosIds: { data: [], certified: false }
				});

				const state = get(store);

				expect(state?.[tokenId]).toStrictEqual({
					data: pendingUtxos,
					certified: true
				});
			});

			it('should handle empty UTXOs', () => {
				store.reset(tokenId);

				store.filter({
					tokenId,
					utxosIds: { data: filterIds, certified: true }
				});

				const state = get(store);

				expect(state?.[tokenId]).toStrictEqual({
					data: [],
					certified: false
				});
			});
		});
	});
});
