import BtcConvertFeeTotal from '$btc/components/convert/BtcConvertFeeTotal.svelte';
import { BTC_CONVERT_FEE } from '$btc/constants/btc.constants';
import {
	UTXOS_FEE_CONTEXT_KEY,
	utxosFeeStore,
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
	const exchangeRate = 0.01;
	const mockContext = ({
		mockUtxosFeeStore,
		destinationTokenId = ICP_TOKEN.id
	}: {
		mockUtxosFeeStore: UtxosFeeStore;
		destinationTokenId?: TokenId;
	}) =>
		new Map([
			[UTXOS_FEE_CONTEXT_KEY, { store: mockUtxosFeeStore }],
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
		utxosFeeStore.reset();
	});

	it('should calculate totalFee correctly if only default fee is available', () => {
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ mockUtxosFeeStore: utxosFeeStore })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBe(BTC_CONVERT_FEE);
	});

	it('should calculate totalFee correctly if default and utxos fees are available', () => {
		utxosFeeStore.setUtxosFee({ utxosFee: mockUtxosFee });
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ mockUtxosFeeStore: utxosFeeStore })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBe(
			BTC_CONVERT_FEE + mockUtxosFee.feeSatoshis
		);
	});

	it('should calculate totalFee correctly if default and ckBTC minter fees are available', () => {
		const tokenId = setupCkBTCStores();
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ mockUtxosFeeStore: utxosFeeStore, destinationTokenId: tokenId })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBe(
			BTC_CONVERT_FEE + mockCkBtcMinterInfo.kyt_fee
		);
	});

	it('should calculate totalFee correctly if all fees are available', () => {
		utxosFeeStore.setUtxosFee({ utxosFee: mockUtxosFee });
		const tokenId = setupCkBTCStores();
		const { component } = render(BtcConvertFeeTotal, {
			context: mockContext({ mockUtxosFeeStore: utxosFeeStore, destinationTokenId: tokenId })
		});
		expect(component.$$.ctx[component.$$.props['totalFee']]).toBe(
			BTC_CONVERT_FEE + mockCkBtcMinterInfo.kyt_fee + mockUtxosFee.feeSatoshis
		);
	});
});
