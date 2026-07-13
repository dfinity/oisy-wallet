import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumSupplyTokensList from '$lib/components/liquidium/supply/LiquidiumSupplyTokensList.svelte';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import { fireEvent, render } from '@testing-library/svelte';

describe('LiquidiumSupplyTokensList', () => {
	const btcMarket: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

	const usdcMarket: LiquidiumMarket = {
		poolId: 'pool-usdc',
		asset: 'USDC',
		chain: 'ETH',
		supplyApy: 3,
		borrowApy: 4,
		frozen: false,
		available: true
	};

	const context = new Map([
		[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] })]
	]);

	beforeEach(() => {
		liquidiumStore.reset();
	});

	it('lists the supply-available tokens except the selected one', () => {
		liquidiumStore.set({ markets: [btcMarket, usdcMarket], portfolio: null, assetPrices: {} });

		const { getByTestId, getByText, queryByText } = render(LiquidiumSupplyTokensList, {
			props: { selectedMarket: btcMarket, onSelectMarket: () => {}, onClose: () => {} },
			context
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
		// The selected token is hidden from its own picker.
		expect(queryByText(BTC_MAINNET_TOKEN.symbol)).toBeNull();
	});

	it('selects the market matching the clicked token', async () => {
		liquidiumStore.set({ markets: [btcMarket, usdcMarket], portfolio: null, assetPrices: {} });

		const onSelectMarket = vi.fn();

		const { getByText } = render(LiquidiumSupplyTokensList, {
			props: { selectedMarket: btcMarket, onSelectMarket, onClose: () => {} },
			context
		});

		await fireEvent.click(getByText(USDC_TOKEN.symbol));

		expect(onSelectMarket).toHaveBeenCalledWith(usdcMarket);
	});

	it('lists every available token when no market is selected (neutral launch)', () => {
		liquidiumStore.set({ markets: [btcMarket, usdcMarket], portfolio: null, assetPrices: {} });

		const { getByText } = render(LiquidiumSupplyTokensList, {
			props: { onSelectMarket: () => {}, onClose: () => {} },
			context
		});

		expect(getByText(BTC_MAINNET_TOKEN.symbol)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
	});
});
