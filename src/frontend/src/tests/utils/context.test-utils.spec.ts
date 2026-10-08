import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockUtxosFeeContextEntry } from '$tests/utils/fee.context.test-utils';
import { mockSendContext, mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import { get } from 'svelte/store';

describe('context.test-utils', () => {
	describe('mockContextMap', () => {
		it('assembles entries into a context Map keyed by context symbol', () => {
			const map = mockContextMap([
				mockSendContextEntry({ token: BTC_MAINNET_TOKEN }),
				mockUtxosFeeContextEntry()
			]);

			expect(map).toBeInstanceOf(Map);
			expect(map.has(SEND_CONTEXT_KEY)).toBeTruthy();
			expect(map.has(UTXOS_FEE_CONTEXT_KEY)).toBeTruthy();
		});
	});

	describe('mockSendContext', () => {
		it('builds a SendContext seeded with the provided token', () => {
			const context = mockSendContext({ token: BTC_MAINNET_TOKEN });

			expect(get(context.sendToken)).toStrictEqual(BTC_MAINNET_TOKEN);
			expect(get(context.sendTokenId)).toStrictEqual(BTC_MAINNET_TOKEN.id);
		});
	});

	describe('mockUtxosFeeContextEntry', () => {
		it('returns an entry holding a usable UTXOs fee store', () => {
			const [key, value] = mockUtxosFeeContextEntry();

			expect(key).toBe(UTXOS_FEE_CONTEXT_KEY);

			const { store } = value as { store: UtxosFeeStore };

			expect(get(store)).toBeUndefined();
		});
	});
});
