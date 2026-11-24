import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import LiquidiumWithdrawTokensList from '$lib/components/liquidium/withdraw/LiquidiumWithdrawTokensList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('LiquidiumWithdrawTokensList', () => {
	const btcReserve: LiquidiumReserve = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		deposited: 1_000n,
		depositedDecimals: 8,
		borrowed: ZERO,
		borrowedDecimals: 8,
		suppliedUsd: 1000,
		borrowedUsd: 0
	};

	const usdcReserve: LiquidiumReserve = {
		poolId: 'pool-usdc',
		asset: 'USDC',
		chain: 'ETH',
		supplyApy: 3,
		borrowApy: 4,
		deposited: 2_000n,
		depositedDecimals: 6,
		borrowed: ZERO,
		borrowedDecimals: 6,
		suppliedUsd: 2000,
		borrowedUsd: 0
	};

	const portfolio = (reserves: LiquidiumReserve[]): LiquidiumPortfolio => ({
		reserves,
		totalSuppliedUsd: 3000,
		totalBorrowedUsd: 0,
		netValueUsd: 3000,
		availableBorrowsUsd: 1500,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 100
	});

	const context = new Map([
		[MODAL_TOKENS_LIST_CONTEXT_KEY, initModalTokensListContext({ tokens: [] })]
	]);

	// The picker offers only rails whose token the user has enabled, so the ERC-20 rail needs its
	// runtime token (suggested → enabled by default) and the ICP rail its ck twin.
	beforeEach(() => {
		liquidiumStore.reset();
		userProfileStore.reset();
		erc20DefaultTokensStore.reset();
		icrcCustomTokensStore.resetAll();

		erc20DefaultTokensStore.set([USDC_TOKEN]);
		icrcCustomTokensStore.setAll([
			{
				data: {
					...mockValidIcCkToken,
					symbol: 'ckBTC',
					network: ICP_TOKEN.network,
					enabled: true
				} as IcrcCustomToken,
				certified: false
			}
		]);
	});

	it('lists the supplied positions except the selected one', () => {
		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, usdcReserve]),
			assetPrices: {}
		});

		const { getByTestId, getByText, queryByText } = render(LiquidiumWithdrawTokensList, {
			props: { selectedReserve: btcReserve, onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
		// The selected token is hidden from its own picker.
		expect(queryByText(BTC_MAINNET_TOKEN.symbol)).toBeNull();
	});

	it('excludes positions with no supplied balance', () => {
		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, { ...usdcReserve, deposited: ZERO }]),
			assetPrices: {}
		});

		const { getByText, queryByText } = render(LiquidiumWithdrawTokensList, {
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

		const { getByText } = render(LiquidiumWithdrawTokensList, {
			props: { selectedReserve: btcReserve, onSelectReserve, onClose: () => {} },
			context
		});

		await fireEvent.click(getByText(USDC_TOKEN.symbol));

		expect(onSelectReserve).toHaveBeenCalledWith(usdcReserve);
	});

	it('lists every supplied position when none is selected (neutral launch)', () => {
		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, usdcReserve]),
			assetPrices: {}
		});

		const { getByText } = render(LiquidiumWithdrawTokensList, {
			props: { onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(getByText(BTC_MAINNET_TOKEN.symbol)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
	});

	it('offers both the native and the ck (ICP) rail for a multi-rail position', () => {
		liquidiumStore.set({ markets: [], portfolio: portfolio([btcReserve]), assetPrices: {} });

		const { getByText } = render(LiquidiumWithdrawTokensList, {
			props: { onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(getByText(BTC_MAINNET_TOKEN.symbol)).toBeInTheDocument();
		expect(getByText('ckBTC')).toBeInTheDocument();
	});

	it('excludes only the selected rail, keeping the other rail of the same pool', () => {
		liquidiumStore.set({ markets: [], portfolio: portfolio([btcReserve]), assetPrices: {} });

		const { getByText, queryByText } = render(LiquidiumWithdrawTokensList, {
			// The native BTC rail is selected → hidden; its ck (ICP → ckBTC) rail must remain.
			props: { selectedReserve: btcReserve, onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		expect(queryByText(BTC_MAINNET_TOKEN.symbol)).toBeNull();
		expect(getByText('ckBTC')).toBeInTheDocument();
	});

	it('omits the delivery rails of the networks the user disabled, keeping their ck twins', () => {
		userProfileStore.set({
			certified: true,
			profile: {
				...mockUserProfile,
				settings: toNullable({
					...mockUserSettings,
					networks: {
						...mockNetworksSettings,
						networks: [
							[{ BitcoinMainnet: null }, { enabled: false, is_testnet: false }],
							[{ EthereumMainnet: null }, { enabled: false, is_testnet: false }]
						]
					}
				})
			}
		});

		liquidiumStore.set({
			markets: [],
			portfolio: portfolio([btcReserve, usdcReserve]),
			assetPrices: {}
		});

		const { getByText, queryByText } = render(LiquidiumWithdrawTokensList, {
			props: { onSelectReserve: () => {}, onClose: () => {} },
			context
		});

		// Only the ck rail of the BTC position survives; the ERC-20 rail of the USDC position goes
		// with the Ethereum network, and its ck twin is not enabled here.
		expect(getByText('ckBTC')).toBeInTheDocument();
		expect(queryByText(BTC_MAINNET_TOKEN.symbol)).toBeNull();
		expect(queryByText(USDC_TOKEN.symbol)).toBeNull();
	});
});
