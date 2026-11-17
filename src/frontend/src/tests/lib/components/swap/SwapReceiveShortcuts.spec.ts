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
import {
	swapSupportedTokensStore,
	type SwapSupportedTokensData,
	type SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { readable, writable, type Readable } from 'svelte/store';

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
	const onDestinationSet = vi.fn();

	const renderShortcuts = ({
		sourceToken = BASE_USDC_TOKEN,
		receiveSupportedData = fromBaseUsdc,
		keptDestinationToken,
		receiveSupportedDataStore
	}: {
		sourceToken?: Token;
		// `null` for providers that have not answered yet.
		receiveSupportedData?: SwapSupportedTokensData | null;
		keptDestinationToken?: Token;
		receiveSupportedDataStore?: Readable<SwapSupportedTokensData | undefined>;
	} = {}) =>
		render(SwapReceiveShortcuts, {
			props: {
				sourceToken,
				navigation: { showReceiveList, showMoveStep },
				emptyField: createRawSnippet(() => ({
					render: () => `<button data-tid="${emptyFieldTestId}" type="button">Select</button>`
				})),
				onDestinationSet
			},
			context: mockContextMap([
				[
					SWAP_CONTEXT_KEY,
					{
						receiveSupportedData:
							receiveSupportedDataStore ?? readable(receiveSupportedData ?? undefined),
						keptDestinationToken: readable(keptDestinationToken),
						setDestinationToken
					}
				]
			])
		});

	const more = (count: number) =>
		replacePlaceholders(en.swap.text.receive_shortcut_more, { $count: `${count}` });

	const expectRow = ({
		row,
		title,
		detail
	}: {
		row: HTMLElement;
		title: string;
		detail: string;
	}) => {
		expect(row).toHaveTextContent(title);
		expect(row).toHaveTextContent(detail);
	};

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
			expectRow({
				row: getByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK),
				title: replacePlaceholders(en.swap.text.receive_shortcut_same_network, {
					$network: BASE_NETWORK.name
				}),
				detail: 'cbBTC, ETH, and TOSHI'
			});
			// Not Internet Computer: USDC on Base cannot reach ckUSDC.
			expectRow({
				row: getByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK),
				title: replacePlaceholders(en.swap.text.receive_shortcut_other_network, {
					$symbol: 'USDC'
				}),
				detail: `${ETHEREUM_NETWORK.name}, ${ARBITRUM_MAINNET_NETWORK.name}, and ${more(3)}`
			});
			expectRow({
				row: getByTestId(SWAP_RECEIVE_SHORTCUT_ANY_TOKEN),
				title: en.swap.text.receive_shortcut_any_token,
				detail: replacePlaceholders(en.swap.text.receive_shortcut_any_token_count, {
					$tokens: '9',
					$networks: '6'
				})
			});
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
		it('should name ckBTC on Internet Computer, converted by Chain Fusion', () => {
			swapSupportedTokensStore.set({
				aggregated: fromBtc,
				providers: [
					{
						key: SwapProvider.CHAIN_FUSION,
						sourceCategory: 'btc',
						supportedSourceTokens: undefined,
						getSupportedDestinations: () => ({ icp: new Set([ckBtc.ledgerCanisterId]) })
					}
				]
			});

			const { getByTestId, queryByTestId } = renderShortcuts({
				sourceToken: BTC_MAINNET_TOKEN,
				receiveSupportedData: fromBtc
			});

			expect(queryByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK)).not.toBeInTheDocument();
			expect(queryByTestId(SWAP_RECEIVE_SHORTCUT_ANY_TOKEN)).not.toBeInTheDocument();

			expectRow({
				row: getByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK),
				title: replacePlaceholders(en.swap.text.receive_shortcut_token_on_network, {
					$symbol: ckBtc.symbol,
					$network: ICP_NETWORK.name
				}),
				detail: replacePlaceholders(en.swap.text.receive_shortcut_convert, {
					$from: BTC_MAINNET_TOKEN.symbol,
					$to: ckBtc.symbol
				})
			});

			swapSupportedTokensStore.reset();
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
			expect(onDestinationSet).toHaveBeenCalledOnce();
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

	it('should show the plain receive field until the providers have answered', () => {
		const { getByTestId, queryByTestId } = renderShortcuts({ receiveSupportedData: null });

		expect(getByTestId(emptyFieldTestId)).toBeInTheDocument();
		expect(queryByTestId(SWAP_RECEIVE_SHORTCUTS)).not.toBeInTheDocument();
	});

	it('should keep focus in the receive card when the providers answer', async () => {
		const receiveSupportedData = writable<SwapSupportedTokensData | undefined>(undefined);

		const { getByTestId } = render(SwapReceiveShortcuts, {
			props: {
				sourceToken: BASE_USDC_TOKEN,
				navigation: { showReceiveList, showMoveStep },
				emptyField: createRawSnippet(() => ({
					render: () => `<button data-tid="${emptyFieldTestId}" type="button">Select</button>`
				})),
				onDestinationSet
			},
			context: mockContextMap([
				[
					SWAP_CONTEXT_KEY,
					{
						receiveSupportedData,
						keptDestinationToken: readable(undefined),
						setDestinationToken
					}
				]
			])
		});

		getByTestId(emptyFieldTestId).focus();

		receiveSupportedData.set(fromBaseUsdc);

		await waitFor(() => expect(getByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK)).toHaveFocus());
	});

	it.each([
		{ testId: SWAP_RECEIVE_SHORTCUT_SAME_NETWORK, removed: 'same' },
		{ testId: SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK, removed: 'other' },
		{ testId: SWAP_RECEIVE_SHORTCUT_ANY_TOKEN, removed: 'any' },
		{ testId: SWAP_RECEIVE_SHORTCUT_KEEP, removed: 'keep' }
	])(
		'should retain focus when $testId disappears while the card stays visible',
		async ({ testId, removed }) => {
			const receiveSupportedDataStore = writable(fromBaseUsdc);
			const { getByTestId, queryByTestId } = renderShortcuts({
				receiveSupportedDataStore,
				keptDestinationToken: SOLANA_USDC_TOKEN
			});

			getByTestId(testId).focus();

			receiveSupportedDataStore.set({
				...fromBaseUsdc,
				evm:
					removed === 'same'
						? listed([ETHEREUM_USDC_TOKEN.address.toLowerCase(), native(ETHEREUM_TOKEN)])
						: removed === 'other'
							? listed([native(BASE_ETH_TOKEN), native(ETHEREUM_TOKEN)])
							: removed === 'any'
								? listed([native(BASE_ETH_TOKEN), ETHEREUM_USDC_TOKEN.address.toLowerCase()])
								: fromBaseUsdc.evm,
				sol: removed === 'other' || removed === 'keep' ? nothing : fromBaseUsdc.sol
			});

			await waitFor(() => expect(queryByTestId(testId)).not.toBeInTheDocument());

			expect(getByTestId(SWAP_RECEIVE_SHORTCUTS)).toContainElement(
				document.activeElement as HTMLElement
			);
		}
	);

	it('should leave focus on a remaining shortcut when provider data changes', async () => {
		const receiveSupportedDataStore = writable(fromBaseUsdc);
		const { getByTestId } = renderShortcuts({ receiveSupportedDataStore });
		const button = getByTestId(SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK);
		button.focus();

		receiveSupportedDataStore.set({ ...fromBaseUsdc, sol: nothing });

		await waitFor(() => expect(button).toHaveFocus());
	});

	it('should restore focus to the plain field when no shortcuts remain', async () => {
		const receiveSupportedDataStore = writable(fromBaseUsdc);
		const { getByTestId } = renderShortcuts({ receiveSupportedDataStore });
		getByTestId(SWAP_RECEIVE_SHORTCUT_SAME_NETWORK).focus();

		receiveSupportedDataStore.set({
			icp: nothing,
			evm: nothing,
			sol: nothing,
			btc: nothing,
			xrp: nothing
		});

		await waitFor(() => expect(getByTestId(emptyFieldTestId)).toHaveFocus());
	});

	it('should show the plain receive field when the pay token reaches nothing', () => {
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

		it('should not offer a cleared receive token the list no longer offers', () => {
			const { queryByTestId } = renderShortcuts({ keptDestinationToken: ckUsdc });

			expect(queryByTestId(SWAP_RECEIVE_SHORTCUT_KEEP)).not.toBeInTheDocument();
		});

		it('should restore the current listed metadata for a kept token', async () => {
			const currentToken = { ...SOLANA_USDC_TOKEN, name: 'Updated USDC metadata', enabled: true };
			vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(
				readable(universe.map((token) => (token.id === currentToken.id ? currentToken : token)))
			);

			const { getByTestId } = renderShortcuts({ keptDestinationToken: SOLANA_USDC_TOKEN });
			await fireEvent.click(getByTestId(SWAP_RECEIVE_SHORTCUT_KEEP));

			expect(setDestinationToken).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining(currentToken)
			);
		});

		it('should put the cleared receive token back', async () => {
			const { getByTestId } = renderShortcuts({ keptDestinationToken: SOLANA_USDC_TOKEN });

			const keep = getByTestId(SWAP_RECEIVE_SHORTCUT_KEEP);

			expect(keep).toHaveTextContent(
				replacePlaceholders(en.swap.text.keep_destination, {
					$symbol: SOLANA_USDC_TOKEN.symbol,
					$network: SOLANA_MAINNET_NETWORK.name
				})
			);

			await fireEvent.click(keep);

			expect(setDestinationToken).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ id: SOLANA_USDC_TOKEN.id })
			);
			expect(onDestinationSet).toHaveBeenCalledOnce();
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
