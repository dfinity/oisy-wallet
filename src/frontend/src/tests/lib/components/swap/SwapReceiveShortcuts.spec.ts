import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { BTC_TOKEN_GROUP } from '$env/tokens/groups/groups.btc.env';
import { USDC_TOKEN_GROUP } from '$env/tokens/groups/groups.usdc.env';
import { USDC_TOKEN as ETHEREUM_USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as ARBITRUM_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.usdc.env';
import { CBBTC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.cbbtc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { USDC_TOKEN as BSC_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdc.env';
import { USDC_TOKEN as POLYGON_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as SOLANA_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapReceiveShortcuts from '$lib/components/swap/SwapReceiveShortcuts.svelte';
import {
	SWAP_RECEIVE_SHORTCUT_ANY_TOKEN,
	SWAP_RECEIVE_SHORTCUT_KEEP,
	SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK,
	SWAP_RECEIVE_SHORTCUT_SAME_NETWORK,
	SWAP_RECEIVE_SHORTCUTS
} from '$lib/constants/test-ids.constants';
import * as crossChainNetworksDerived from '$lib/derived/cross-chain-networks.derived';
import * as networksDerived from '$lib/derived/networks.derived';
import * as swapDerived from '$lib/derived/swap.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import { trackSwapReceiveShortcut } from '$lib/services/swap-receive-shortcut-analytics.services';
import type {
	SwapSupportedTokensData,
	SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { Token } from '$lib/types/token';
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$lib/services/swap-receive-shortcut-analytics.services', () => ({
	trackSwapReceiveShortcut: vi.fn()
}));

describe('SwapReceiveShortcuts', () => {
	const emptyFieldTestId = 'empty-receive-field';

	const ckBtc = {
		...mockValidIcToken,
		id: parseTokenId('ckBTC'),
		symbol: 'ckBTC',
		ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
		groupData: BTC_TOKEN_GROUP
	};

	const ckUsdc = {
		...mockValidIcToken,
		id: parseTokenId('ckUSDC'),
		symbol: 'ckUSDC',
		ledgerCanisterId: 'xevnm-gaaaa-aaaar-qafnq-cai',
		groupData: USDC_TOKEN_GROUP
	};

	const toshi = {
		...CBBTC_TOKEN,
		id: parseTokenId('TOSHI'),
		symbol: 'TOSHI',
		address: '0x0000000000000000000000000000000000000001',
		groupData: undefined
	};

	const universe = [
		BASE_USDC_TOKEN,
		BASE_ETH_TOKEN,
		CBBTC_TOKEN,
		toshi,
		ETHEREUM_USDC_TOKEN,
		ARBITRUM_USDC_TOKEN,
		BSC_USDC_TOKEN,
		POLYGON_USDC_TOKEN,
		SOLANA_USDC_TOKEN,
		ETHEREUM_TOKEN,
		ckUsdc,
		ckBtc,
		BTC_MAINNET_TOKEN
	].map((token) => ({ ...token, enabled: true }));

	const listed = (ids: string[]): SwapSupportedTokensInfo => ({
		coverage: 'all',
		supportedTokenIds: new Set(ids)
	});

	const nothing = listed([]);

	const native = (token: Token) =>
		nativeSwapTokenIdentifier({ networkId: token.network.id, symbol: token.symbol });

	// USDC on Base reaches the EVM and Solana tokens, and not ckUSDC (OneSec only unwraps).
	const fromBaseUsdc: SwapSupportedTokensData = {
		icp: nothing,
		evm: listed([
			...[
				BASE_USDC_TOKEN,
				CBBTC_TOKEN,
				toshi,
				ETHEREUM_USDC_TOKEN,
				ARBITRUM_USDC_TOKEN,
				BSC_USDC_TOKEN,
				POLYGON_USDC_TOKEN
			].map(({ address }) => address.toLowerCase()),
			native(BASE_ETH_TOKEN),
			native(ETHEREUM_TOKEN)
		]),
		sol: listed([SOLANA_USDC_TOKEN.address]),
		btc: nothing,
		xrp: nothing
	};

	// BTC reaches ckBTC only.
	const fromBtc: SwapSupportedTokensData = {
		icp: listed([ckBtc.ledgerCanisterId]),
		evm: nothing,
		sol: nothing,
		btc: nothing,
		xrp: nothing
	};

	const showReceiveList = vi.fn();
	const showMoveStep = vi.fn();
	const setDestinationToken = vi.fn();

	const renderShortcuts = ({
		sourceToken = BASE_USDC_TOKEN,
		receiveSupportedData = fromBaseUsdc,
		keptDestinationToken
	}: {
		sourceToken?: Token;
		// `null` for providers that have not answered yet.
		receiveSupportedData?: SwapSupportedTokensData | null;
		keptDestinationToken?: Token;
	} = {}) =>
		render(SwapReceiveShortcuts, {
			props: {
				sourceToken,
				navigation: { showReceiveList, showMoveStep },
				emptyField: createMockSnippet(emptyFieldTestId)
			},
			context: mockContextMap([
				[
					SWAP_CONTEXT_KEY,
					{
						receiveSupportedData: readable(receiveSupportedData ?? undefined),
						keptDestinationToken: readable(keptDestinationToken),
						setDestinationToken
					}
				]
			])
		});

	const titleAndDetail = (row: HTMLElement | null) =>
		[...(row?.querySelectorAll('span.text-base, span.text-sm') ?? [])].map(({ textContent }) =>
			textContent?.trim()
		);

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(readable(universe));
		vi.spyOn(crossChainNetworksDerived, 'crossChainSwapNetworksMainnets', 'get').mockReturnValue(
			readable([
				ICP_NETWORK,
				ETHEREUM_NETWORK,
				ARBITRUM_MAINNET_NETWORK,
				BASE_NETWORK,
				BSC_MAINNET_NETWORK,
				POLYGON_MAINNET_NETWORK,
				SOLANA_MAINNET_NETWORK,
				BTC_MAINNET_NETWORK
			])
		);
		// Chain order.
		vi.spyOn(networksDerived, 'networks', 'get').mockReturnValue(
			readable([
				BTC_MAINNET_NETWORK,
				ETHEREUM_NETWORK,
				ICP_NETWORK,
				ARBITRUM_MAINNET_NETWORK,
				BASE_NETWORK,
				BSC_MAINNET_NETWORK,
				POLYGON_MAINNET_NETWORK,
				SOLANA_MAINNET_NETWORK
			])
		);
		vi.spyOn(tokensDerived, 'tokensToPin', 'get').mockReturnValue(readable([]));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('USDC on Base', () => {
		it('should offer all three shortcuts, in order, with what is behind each', () => {
			const { getByTestId, getAllByRole } = renderShortcuts();

			expect(getByTestId(SWAP_RECEIVE_SHORTCUTS)).toBeInTheDocument();

			expect(getAllByRole('button').map(({ dataset }) => dataset.tid)).toEqual([
				SWAP_RECEIVE_SHORTCUT_SAME_NETWORK,
				SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK,
				SWAP_RECEIVE_SHORTCUT_ANY_TOKEN
			]);

			// No balance and no pin: the list orders these by symbol.
			expect(titleAndDetail(getByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK))).toEqual([
				'Another token on Base',
				'cbBTC, ETH, and TOSHI'
			]);
			// Not Internet Computer: USDC on Base cannot reach ckUSDC.
			expect(titleAndDetail(getByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK))).toEqual([
				'USDC on another network',
				'Ethereum, Arbitrum, and 3 more'
			]);
			expect(titleAndDetail(getByTestId(SWAP_RECEIVE_SHORTCUT_ANY_TOKEN))).toEqual([
				'Any token',
				'9 tokens on 6 networks'
			]);
		});

		it('should open the receive list on Base', async () => {
			const { getByTestId } = renderShortcuts();

			await fireEvent.click(getByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK));

			expect(showReceiveList).toHaveBeenCalledExactlyOnceWith(BASE_NETWORK);
			expect(trackSwapReceiveShortcut).toHaveBeenCalledExactlyOnceWith({
				action: 'same_network',
				sourceToken: BASE_USDC_TOKEN,
				destinationToken: undefined
			});
		});

		it('should open the receive list on all networks', async () => {
			const { getByTestId } = renderShortcuts();

			await fireEvent.click(getByTestId(SWAP_RECEIVE_SHORTCUT_ANY_TOKEN));

			expect(showReceiveList).toHaveBeenCalledExactlyOnceWith(undefined);
			expect(trackSwapReceiveShortcut).toHaveBeenCalledExactlyOnceWith({
				action: 'any_token',
				sourceToken: BASE_USDC_TOKEN,
				destinationToken: undefined
			});
		});

		it('should open the network step, which tracks the pick', async () => {
			const { getByTestId } = renderShortcuts();

			await fireEvent.click(getByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK));

			expect(showMoveStep).toHaveBeenCalledOnce();
			expect(setDestinationToken).not.toHaveBeenCalled();
			expect(trackSwapReceiveShortcut).not.toHaveBeenCalled();
		});
	});

	describe('BTC', () => {
		it('should offer only BTC on another network, naming ckBTC', () => {
			const { getByTestId, queryByTestId } = renderShortcuts({
				sourceToken: BTC_MAINNET_TOKEN,
				receiveSupportedData: fromBtc
			});

			expect(queryByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK)).not.toBeInTheDocument();
			expect(queryByTestId(SWAP_RECEIVE_SHORTCUT_ANY_TOKEN)).not.toBeInTheDocument();
			expect(titleAndDetail(getByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK))).toEqual([
				'BTC on another network',
				'Internet Computer, as ckBTC'
			]);
		});

		it('should set ckBTC in one tap', async () => {
			const { getByTestId } = renderShortcuts({
				sourceToken: BTC_MAINNET_TOKEN,
				receiveSupportedData: fromBtc
			});

			await fireEvent.click(getByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK));

			expect(showMoveStep).not.toHaveBeenCalled();
			expect(setDestinationToken).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ id: ckBtc.id })
			);
			expect(trackSwapReceiveShortcut).toHaveBeenCalledExactlyOnceWith({
				action: 'other_network',
				sourceToken: BTC_MAINNET_TOKEN,
				destinationToken: expect.objectContaining({ id: ckBtc.id })
			});
		});
	});

	it('should offer no other network for a token in no group', () => {
		const { getByTestId, queryByTestId } = renderShortcuts({ sourceToken: toshi });

		expect(getByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK)).toBeInTheDocument();
		expect(queryByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK)).not.toBeInTheDocument();
		expect(getByTestId(SWAP_RECEIVE_SHORTCUT_ANY_TOKEN)).toBeInTheDocument();
	});

	it("should show today's empty field until the providers have answered", () => {
		const { getByTestId, queryByTestId } = renderShortcuts({ receiveSupportedData: null });

		expect(getByTestId(emptyFieldTestId)).toBeInTheDocument();
		expect(queryByTestId(SWAP_RECEIVE_SHORTCUTS)).not.toBeInTheDocument();
	});

	it("should show today's empty field when the pay token reaches nothing", () => {
		const { getByTestId, queryByTestId } = renderShortcuts({
			receiveSupportedData: { icp: nothing, evm: nothing, sol: nothing, btc: nothing, xrp: nothing }
		});

		expect(getByTestId(emptyFieldTestId)).toBeInTheDocument();
		expect(queryByTestId(SWAP_RECEIVE_SHORTCUTS)).not.toBeInTheDocument();
	});

	describe('Keep', () => {
		it('should not show without a cleared receive token', () => {
			const { queryByTestId } = renderShortcuts();

			expect(queryByTestId(SWAP_RECEIVE_SHORTCUT_KEEP)).not.toBeInTheDocument();
		});

		it('should put the cleared receive token back', async () => {
			const { getByTestId } = renderShortcuts({ keptDestinationToken: SOLANA_USDC_TOKEN });

			const keep = getByTestId(SWAP_RECEIVE_SHORTCUT_KEEP);

			expect(keep).toHaveTextContent('Keep USDC on Solana');

			await fireEvent.click(keep);

			expect(setDestinationToken).toHaveBeenCalledExactlyOnceWith(SOLANA_USDC_TOKEN);
			expect(trackSwapReceiveShortcut).toHaveBeenCalledExactlyOnceWith({
				action: 'keep',
				sourceToken: BASE_USDC_TOKEN,
				destinationToken: undefined
			});
		});
	});

	it('should title the card as the receive field', () => {
		const { getByTestId } = renderShortcuts();

		expect(getByTestId(SWAP_RECEIVE_SHORTCUTS)).toHaveTextContent(
			en.tokens.text.destination_token_title
		);
	});
});
