import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SwapTokensList from '$lib/components/swap/SwapTokensList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { MODAL_TOKENS_LIST, NETWORK_FILTER } from '$lib/constants/test-ids.constants';
import * as swapDerived from '$lib/derived/swap.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import {
	swapSupportedTokensStore,
	type SwapSupportedTokensData
} from '$lib/stores/swap-supported-tokens.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { Network } from '$lib/types/network';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { openFilterChip } from '$tests/utils/filter-chip.test-utils';
import {
	mockModalNetworksListContextEntry,
	mockModalTokensListContextEntry
} from '$tests/utils/misc.context.test-utils';
import { nonNullish } from '@dfinity/utils';
import { render, screen, within } from '@testing-library/svelte';
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

	const mockContext = ({
		sourceToken,
		destinationToken = mockValidIcCkToken,
		receiveSupportedData,
		filterNetwork,
		networks = [ICP_NETWORK, BTC_MAINNET_NETWORK]
	}: {
		sourceToken?: Token;
		destinationToken?: Token;
		receiveSupportedData?: SwapSupportedTokensData;
		filterNetwork?: Network;
		networks?: Network[];
	} = {}) =>
		mockContextMap([
			[
				SWAP_CONTEXT_KEY,
				{
					sourceToken: readable(sourceToken),
					destinationToken: readable(destinationToken),
					destinationTokenExchangeRate: readable(0.00002),
					receiveSupportedData: readable(receiveSupportedData)
				}
			],
			// As `SwapContexts` sets it up.
			mockModalTokensListContextEntry({ tokens: [ICP_TOKEN], filterNetwork, sortByBalance: false }),
			mockModalNetworksListContextEntry({ networks })
		]);

	const networkChip = () => screen.getByTestId(NETWORK_FILTER);

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

		it('shows all networks when the kept network has nothing left to pick', () => {
			// Bitcoin's only token is the receive side's pick, as after pressing ⇅.
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({
					sourceToken: icpToken,
					destinationToken: btcToken,
					filterNetwork: BTC_MAINNET_NETWORK
				})
			});

			expect(networkChip()).toHaveTextContent(get(i18n).networks.chain_fusion);
			expect(rowFor(icpToken.symbol)).toBeInTheDocument();
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

			expect(networkChip()).toHaveTextContent(BTC_MAINNET_NETWORK.name);
			expect(rowFor(icpToken.symbol)).toBeUndefined();
		});

		it('leaves out the tokens on networks this side may not use', () => {
			// As on the receive side, where the networks are the ones the pay token reaches.
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ networks: [ICP_NETWORK] })
			});

			expect(networkChip()).toHaveTextContent(get(i18n).networks.chain_fusion);
			expect(rowFor(icpToken.symbol)).toBeInTheDocument();
			expect(rowFor(btcToken.symbol)).toBeUndefined();
		});

		it('offers only the networks with something to pick', async () => {
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: icpToken, destinationToken: btcToken })
			});

			const panel = await openFilterChip(NETWORK_FILTER);

			expect(within(panel).getByText(ICP_NETWORK.name)).toBeInTheDocument();
			expect(within(panel).queryByText(BTC_MAINNET_NETWORK.name)).not.toBeInTheDocument();
		});
	});

	describe('picking a token to pay with', () => {
		const zeroBalanceToken = { ...btcToken };
		const fundedToken = { ...icpToken };
		const inactiveToken = {
			...mockValidIcToken,
			id: parseTokenId('InactiveIcTokenId'),
			symbol: 'INACT',
			enabled: false
		};

		beforeEach(() => {
			vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(
				readable([zeroBalanceToken, fundedToken, inactiveToken])
			);

			balancesStore.reset(zeroBalanceToken.id);
			balancesStore.reset(fundedToken.id);
			balancesStore.reset(inactiveToken.id);

			balancesStore.set({ id: zeroBalanceToken.id, data: { data: ZERO, certified: true } });
			balancesStore.set({ id: fundedToken.id, data: { data: 5n, certified: true } });
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const rowFor = (symbol: string) =>
			screen.getAllByRole('button').find((button) => button.textContent?.trim().startsWith(symbol));

		it('should disable the tokens without a balance to pay from', () => {
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: undefined })
			});

			expect(rowFor(zeroBalanceToken.symbol)).toBeDisabled();
			expect(rowFor(inactiveToken.symbol)).toBeDisabled();
			expect(rowFor(fundedToken.symbol)).toBeEnabled();
		});

		it('should not let an inactive token be picked, even with a balance', () => {
			balancesStore.set({ id: inactiveToken.id, data: { data: 5n, certified: true } });

			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: undefined })
			});

			expect(rowFor(inactiveToken.symbol)).toBeDisabled();
		});

		it('should let an enabled token whose balance is still loading be picked', () => {
			balancesStore.reset(zeroBalanceToken.id);

			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: undefined })
			});

			expect(rowFor(zeroBalanceToken.symbol)).toBeEnabled();
		});

		it('should disable nothing on the receive side', () => {
			render(SwapTokensList, {
				props: destinationProps,
				context: mockContext({ sourceToken: undefined, destinationToken: undefined })
			});

			expect(rowFor(zeroBalanceToken.symbol)).toBeEnabled();
			expect(rowFor(inactiveToken.symbol)).toBeEnabled();
			expect(rowFor(fundedToken.symbol)).toBeEnabled();
		});
	});

	describe('order', () => {
		const fundedToken = { ...icpToken };
		const zeroBalanceToken = { ...btcToken };
		const inactiveWithBalance = {
			...mockValidIcToken,
			id: parseTokenId('InactiveWithBalanceTokenId'),
			symbol: 'ZED',
			enabled: false
		};
		const inactiveWithoutBalance = {
			...mockValidIcToken,
			id: parseTokenId('InactiveWithoutBalanceTokenId'),
			symbol: 'ALPHA',
			enabled: false
		};

		const allTokens = [inactiveWithBalance, zeroBalanceToken, inactiveWithoutBalance, fundedToken];

		beforeEach(() => {
			vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(readable(allTokens));

			allTokens.forEach(({ id }) => balancesStore.reset(id));

			balancesStore.set({ id: fundedToken.id, data: { data: 5n, certified: true } });
			balancesStore.set({ id: zeroBalanceToken.id, data: { data: ZERO, certified: true } });
			balancesStore.set({ id: inactiveWithBalance.id, data: { data: 500n, certified: true } });
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const listedSymbols = (): string[] =>
			screen.getAllByRole('button').reduce<string[]>((acc, button) => {
				const token = allTokens.find(({ symbol }) => button.textContent?.trim().startsWith(symbol));

				return nonNullish(token) ? [...acc, token.symbol] : acc;
			}, []);

		const expectedSymbols = [
			fundedToken.symbol,
			zeroBalanceToken.symbol,
			inactiveWithoutBalance.symbol,
			inactiveWithBalance.symbol
		];

		it('should list inactive tokens last, by symbol, whatever their balance', () => {
			render(SwapTokensList, {
				props: sourceProps,
				context: mockContext({ sourceToken: undefined })
			});

			expect(listedSymbols()).toEqual(expectedSymbols);
		});

		it('should list inactive tokens last on the receive side too', () => {
			render(SwapTokensList, {
				props: destinationProps,
				context: mockContext({ sourceToken: undefined, destinationToken: undefined })
			});

			expect(listedSymbols()).toEqual(expectedSymbols);
		});
	});
});
