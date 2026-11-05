import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
import { MODAL_FILTER_NETWORKS, MODAL_TOKENS_LIST } from '$lib/constants/test-ids.constants';
import * as swapDerived from '$lib/derived/swap.derived';
import {
	initModalNetworksListContext,
	MODAL_NETWORKS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-networks-list.store';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	type ModalTokensListContext
} from '$lib/stores/modal-tokens-list.store';
import {
	swapSupportedTokensStore,
	type SwapSupportedTokensData
} from '$lib/stores/swap-supported-tokens.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { Network } from '$lib/types/network';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('SwapTokensList', () => {
	const props = {
		onSelectToken: () => {},
		onCloseTokensList: () => {}
	};

	const sourceProps = { ...props, side: 'source' as const };

	const destinationProps = { ...props, side: 'destination' as const };

	const btcToken = { ...BTC_MAINNET_TOKEN, enabled: true };
	const icpToken = { ...ICP_TOKEN, enabled: true };

	let tokensListContext: ModalTokensListContext;

	const mockContext = ({
		sourceToken,
		destinationToken = mockValidIcCkToken,
		receiveSupportedData,
		filterNetwork
	}: {
		sourceToken?: Token;
		destinationToken?: Token;
		receiveSupportedData?: SwapSupportedTokensData;
		filterNetwork?: Network;
	} = {}) => {
		const result = new Map();

		result.set(SWAP_CONTEXT_KEY, {
			sourceToken: readable(sourceToken),
			destinationToken: readable(destinationToken),
			destinationTokenExchangeRate: readable(0.00002),
			receiveSupportedData: readable(receiveSupportedData)
		});

		tokensListContext = initModalTokensListContext({ tokens: [ICP_TOKEN], filterNetwork });

		result.set(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

		result.set(
			MODAL_NETWORKS_LIST_CONTEXT_KEY,
			initModalNetworksListContext({ networks: [ICP_NETWORK, BTC_MAINNET_NETWORK] })
		);

		return result;
	};

	beforeEach(() => {
		swapSupportedTokensStore.reset();
	});

	it('renders tokens list', () => {
		const { getByTestId } = render(SwapTokensList, {
			props,
			context: mockContext()
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	it('renders tokens list on the destination side without a source', () => {
		const { getByTestId } = render(SwapTokensList, {
			props: destinationProps,
			context: mockContext()
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	it('renders tokens list on the destination side with receive supported data', () => {
		swapSupportedTokensStore.set({
			aggregated: {
				icp: { coverage: 'all', supportedTokenIds: new Set() },
				evm: { coverage: 'none', supportedTokenIds: new Set() },
				sol: { coverage: 'none', supportedTokenIds: new Set() },
				btc: { coverage: 'none', supportedTokenIds: new Set() },
				xrp: { coverage: 'none', supportedTokenIds: new Set() }
			},
			providers: [
				{
					key: SwapProvider.ONE_SEC,
					sourceCategory: 'icp',
					supportedSourceTokens: new Set([mockValidIcToken.ledgerCanisterId]),
					getSupportedDestinations: () => undefined
				}
			]
		});

		const { getByTestId } = render(SwapTokensList, {
			props: destinationProps,
			context: mockContext({
				sourceToken: mockValidIcToken,
				receiveSupportedData: {
					icp: { coverage: 'all', supportedTokenIds: new Set() },
					evm: { coverage: 'all', supportedTokenIds: new Set() },
					sol: { coverage: 'all', supportedTokenIds: new Set() },
					btc: { coverage: 'none', supportedTokenIds: new Set() },
					xrp: { coverage: 'none', supportedTokenIds: new Set() }
				}
			})
		});

		expect(getByTestId(MODAL_TOKENS_LIST)).toBeInTheDocument();
	});

	describe('with a known token universe', () => {
		beforeEach(() => {
			vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(
				readable([btcToken, icpToken])
			);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const rowFor = (symbol: string) =>
			screen.getAllByRole('button').find((button) => button.textContent?.trim().startsWith(symbol));

		it("keeps this side's pick in the list, marked as selected", () => {
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: btcToken, destinationToken: mockValidIcCkToken })
			});

			expect(rowFor(btcToken.symbol)).toHaveAttribute('aria-pressed', 'true');
			expect(rowFor(icpToken.symbol)).toHaveAttribute('aria-pressed', 'false');
		});

		it("leaves the other side's pick out of the list", () => {
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: icpToken, destinationToken: btcToken })
			});

			expect(rowFor(btcToken.symbol)).toBeUndefined();
			expect(rowFor(icpToken.symbol)).toBeInTheDocument();
		});

		it('falls back to all networks when the kept network has nothing left to pick', () => {
			// Bitcoin's only token is the receive side's pick, as after pressing ⇅.
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({
					sourceToken: icpToken,
					destinationToken: btcToken,
					filterNetwork: BTC_MAINNET_NETWORK
				})
			});

			expect(get(tokensListContext.filterNetwork)).toBeUndefined();
		});

		it('keeps a network that still has tokens', () => {
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({
					sourceToken: btcToken,
					destinationToken: mockValidIcCkToken,
					filterNetwork: BTC_MAINNET_NETWORK
				})
			});

			expect(get(tokensListContext.filterNetwork)).toEqual(BTC_MAINNET_NETWORK);
		});

		it('offers only the networks with something to pick', async () => {
			const { getByTestId, findByTestId } = render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: icpToken, destinationToken: btcToken })
			});

			await fireEvent.click(getByTestId(`${MODAL_FILTER_NETWORKS}-trigger`));

			const panel = await findByTestId('popover-content');

			expect(within(panel).getByText(ICP_NETWORK.name)).toBeInTheDocument();
			expect(within(panel).queryByText(BTC_MAINNET_NETWORK.name)).not.toBeInTheDocument();
		});
	});
});
