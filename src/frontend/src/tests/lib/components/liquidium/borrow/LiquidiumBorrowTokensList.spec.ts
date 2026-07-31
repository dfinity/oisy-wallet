import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import LiquidiumBorrowTokensList from '$lib/components/liquidium/borrow/LiquidiumBorrowTokensList.svelte';
import { MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { LiquidiumMarket } from '$lib/types/liquidium';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import {
	mockNetworksSettings,
	mockUserProfile,
	mockUserSettings
} from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('LiquidiumBorrowTokensList', () => {
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

	const ckBtcMarket: LiquidiumMarket = {
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'ICP',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true
	};

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

	it('lists the borrow-available tokens except the selected one', () => {
		liquidiumStore.set({ markets: [btcMarket, usdcMarket], portfolio: null, assetPrices: {} });

		const { getByTestId, getByText, queryByText } = render(LiquidiumBorrowTokensList, {
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

		const { getByText } = render(LiquidiumBorrowTokensList, {
			props: { selectedMarket: btcMarket, onSelectMarket, onClose: () => {} },
			context
		});

		await fireEvent.click(getByText(USDC_TOKEN.symbol));

		expect(onSelectMarket).toHaveBeenCalledWith(usdcMarket);
	});

	it('lists every available token when no market is selected (neutral launch)', () => {
		liquidiumStore.set({ markets: [btcMarket, usdcMarket], portfolio: null, assetPrices: {} });

		const { getByText } = render(LiquidiumBorrowTokensList, {
			props: { onSelectMarket: () => {}, onClose: () => {} },
			context
		});

		expect(getByText(BTC_MAINNET_TOKEN.symbol)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
	});

	it('omits the rails of the networks the user disabled, keeping their ck twins', () => {
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
			markets: [btcMarket, usdcMarket, ckBtcMarket],
			portfolio: null,
			assetPrices: {}
		});

		const { getByText, queryByText } = render(LiquidiumBorrowTokensList, {
			props: { onSelectMarket: () => {}, onClose: () => {} },
			context
		});

		expect(getByText('ckBTC')).toBeInTheDocument();
		expect(queryByText(BTC_MAINNET_TOKEN.symbol)).toBeNull();
		expect(queryByText(USDC_TOKEN.symbol)).toBeNull();
		expect(queryByText(ETHEREUM_TOKEN.symbol)).toBeNull();
	});
});
