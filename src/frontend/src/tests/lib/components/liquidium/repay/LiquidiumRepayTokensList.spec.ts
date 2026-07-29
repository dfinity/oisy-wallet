import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import LiquidiumRepayTokensList from '$lib/components/liquidium/repay/LiquidiumRepayTokensList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { fireEvent, render } from '@testing-library/svelte';

// ck twins so the ICP (ck) rail resolves a display token in the picker; the native rails
// resolve statically and need no token list.
vi.mock('$lib/derived/tokens.derived', async (importOriginal) => {
	const { readable } = await import('svelte/store');
	const { mockValidIcCkToken } = await import('$tests/mocks/ic-tokens.mock');
	const { parseTokenId } = await import('$lib/validation/token.validation');

	return {
		...(await importOriginal<Record<string, unknown>>()),
		tokens: readable([
			{ ...mockValidIcCkToken, id: parseTokenId('ckBTC'), symbol: 'ckBTC' },
			{ ...mockValidIcCkToken, id: parseTokenId('ckUSDC'), symbol: 'ckUSDC' }
		])
	};
});

describe('LiquidiumRepayTokensList', () => {
	const btcReserve: LiquidiumReserve = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		deposited: ZERO,
		depositedDecimals: 8,
		borrowed: 1_000n,
		borrowedDecimals: 8,
		suppliedUsd: 0,
		borrowedUsd: 1000
	};

	const usdcReserve: LiquidiumReserve = {
		poolId: 'pool-usdc',
		asset: 'USDC',
		chain: 'ETH',
		supplyApy: 3,
		borrowApy: 4,
		deposited: ZERO,
		depositedDecimals: 6,
		borrowed: 2_000n,
		borrowedDecimals: 6,
		suppliedUsd: 0,
		borrowedUsd: 2000
	};

	const portfolio = (reserves: LiquidiumReserve[]): LiquidiumPortfolio => ({
		reserves,
		totalSuppliedUsd: 0,
		totalBorrowedUsd: 3000,
		netValueUsd: -3000,
		availableBorrowsUsd: 0,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 50
	});

	const context = new Map([
		[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] })]
	]);

	beforeEach(() => {
		liquidiumStore.reset();
	});

	it('lists the positions with debt except the selected one', () => {
		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, usdcReserve]),
			assetPrices: {}
		});

		const { getByTestId, getByText, queryByText } = render(LiquidiumRepayTokensList, {
			props: { selectedReserve: btcReserve, onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
		// The selected token is hidden from its own picker.
		expect(queryByText(BTC_MAINNET_TOKEN.symbol)).toBeNull();
	});

	it('excludes positions with no outstanding debt', () => {
		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, { ...usdcReserve, borrowed: ZERO }]),
			assetPrices: {}
		});

		const { getByText, queryByText } = render(LiquidiumRepayTokensList, {
			props: { onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(getByText(BTC_MAINNET_TOKEN.symbol)).toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.symbol)).toBeNull();
	});

	it('selects the reserve matching the clicked token', async () => {
		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, usdcReserve]),
			assetPrices: {}
		});

		const onSelectReserve = vi.fn();

		const { getByText } = render(LiquidiumRepayTokensList, {
			props: { selectedReserve: btcReserve, onSelectReserve, onClose: () => {} },
			context
		});

		await fireEvent.click(getByText(USDC_TOKEN.symbol));

		expect(onSelectReserve).toHaveBeenCalledWith(usdcReserve);
	});

	it('lists every position with debt when none is selected (neutral launch)', () => {
		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, usdcReserve]),
			assetPrices: {}
		});

		const { getByText } = render(LiquidiumRepayTokensList, {
			props: { onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(getByText(BTC_MAINNET_TOKEN.symbol)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
	});

	it('offers both the native and the ck (ICP) rail for a multi-rail position', () => {
		liquidiumStore.set({ markets: [], portfolio: portfolio([btcReserve]), assetPrices: {} });

		const { getByText } = render(LiquidiumRepayTokensList, {
			props: { onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(getByText(BTC_MAINNET_TOKEN.symbol)).toBeInTheDocument();
		expect(getByText('ckBTC')).toBeInTheDocument();
	});

	it('excludes only the selected rail, keeping the other rail of the same pool', () => {
		liquidiumStore.set({ markets: [], portfolio: portfolio([btcReserve]), assetPrices: {} });

		const { getByText, queryByText } = render(LiquidiumRepayTokensList, {
			// The native BTC rail is selected → hidden; its ck (ICP → ckBTC) rail must remain.
			props: { selectedReserve: btcReserve, onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(queryByText(BTC_MAINNET_TOKEN.symbol)).toBeNull();
		expect(getByText('ckBTC')).toBeInTheDocument();
	});
});
