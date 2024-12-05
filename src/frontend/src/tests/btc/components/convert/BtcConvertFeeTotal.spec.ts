import BtcConvertFeeTotal from '$btc/components/convert/BtcConvertFeeTotal.svelte';
import { BTC_CONVERT_FEE } from '$btc/constants/btc.constants';
import {
	initUtxosFeeStore,
	UTXOS_FEE_CONTEXT_KEY,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import type { TokenId } from '$lib/types/token';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockCkBtcMinterInfo } from '$tests/mocks/ckbtc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupCkBTCStores } from '$tests/utils/ckbtc-stores.test-utils';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcConvertFeeTotal', () => {
	let store: UtxosFeeStore;
	const exchangeRate = 0.01;
	const mockContext = ({
		utxosFeeStore,
		destinationTokenId = ICP_TOKEN.id
	}: {
		utxosFeeStore: UtxosFeeStore;
		destinationTokenId?: TokenId;
	}) =>
		new Map([
			[UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore }],
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(BTC_MAINNET_TOKEN),
					sourceTokenExchangeRate: readable(exchangeRate),
					destinationToken: readable({ ...ICP_TOKEN, id: destinationTokenId })
				}
			]
		]);

	beforeEach(() => {
		mockPage.reset();
		store = initUtxosFeeStore();
		store.reset();
	});

	it('should not update totalFee if only default fee is available', () => {
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ utxosFeeStore: store })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBeUndefined();
	});

	it('should not update totalFee if only default and utxos fees are available', () => {
		store.setUtxosFee({ utxosFee: mockUtxosFee });
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ utxosFeeStore: store })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBeUndefined();
	});

	it('should not update totalFee if only default and ckBTC minter fees are available', () => {
		const tokenId = setupCkBTCStores();
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ utxosFeeStore: store, destinationTokenId: tokenId })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBeUndefined();
	});

	it('should calculate totalFee correctly if all fees are available', () => {
		store.setUtxosFee({ utxosFee: mockUtxosFee });
		const tokenId = setupCkBTCStores();
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ utxosFeeStore: store, destinationTokenId: tokenId })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBe(
			BTC_CONVERT_FEE + mockCkBtcMinterInfo.kyt_fee + mockUtxosFee.feeSatoshis
		);
	});
});
