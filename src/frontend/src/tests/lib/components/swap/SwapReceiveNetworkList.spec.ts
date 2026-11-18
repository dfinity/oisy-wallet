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
import SwapReceiveNetworkList from '$lib/components/swap/SwapReceiveNetworkList.svelte';
import {
	SWAP_RECEIVE_NETWORK_LIST,
	SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK
} from '$lib/constants/test-ids.constants';
import * as crossChainNetworksDerived from '$lib/derived/cross-chain-networks.derived';
import * as exchangesDerived from '$lib/derived/exchange.derived';
import * as networksDerived from '$lib/derived/networks.derived';
import * as swapDerived from '$lib/derived/swap.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import { trackSwapReceiveShortcut } from '$lib/services/swap-receive-shortcut-analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import { privacyModeStore } from '$lib/stores/settings.store';
import type {
	SwapSupportedTokensData,
	SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

vi.mock('$lib/services/swap-receive-shortcut-analytics.services', () => ({
	trackSwapReceiveShortcut: vi.fn()
}));

describe('SwapReceiveNetworkList', () => {
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

	const onSelectToken = vi.fn();
	const onClose = vi.fn();

	const renderList = ({
		sourceToken = BASE_USDC_TOKEN,
		receiveSupportedData = fromBaseUsdc,
		destinationToken,
		fromShortcut = false
	}: {
		sourceToken?: Token | null;
		receiveSupportedData?: SwapSupportedTokensData;
		destinationToken?: Token;
		fromShortcut?: boolean;
	} = {}) =>
		render(SwapReceiveNetworkList, {
			props: { onSelectToken, onClose },
			context: mockContextMap([
				[
					SWAP_CONTEXT_KEY,
					{
						sourceToken: readable(sourceToken ?? undefined),
						destinationToken: readable(destinationToken),
						receiveSupportedData: readable(receiveSupportedData),
						tokenListReturnFocus: writable(
							fromShortcut ? SWAP_RECEIVE_SHORTCUT_OTHER_NETWORK : undefined
						)
					}
				]
			])
		});

	const rows = (container: HTMLElement) =>
		within(
			container.querySelector(`[data-tid="${SWAP_RECEIVE_NETWORK_LIST}"]`) as HTMLElement
		).getAllByRole('button');

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
		balancesStore.reset(SOLANA_USDC_TOKEN.id);
		privacyModeStore.reset({ key: 'privacy-mode' });

		vi.restoreAllMocks();
	});

	it('should list the networks USDC on Base reaches, in chain order, without Internet Computer', () => {
		const { container } = renderList();

		const listed = rows(container);

		expect(listed).toHaveLength(5);

		[
			ETHEREUM_NETWORK,
			ARBITRUM_MAINNET_NETWORK,
			BSC_MAINNET_NETWORK,
			POLYGON_MAINNET_NETWORK,
			SOLANA_MAINNET_NETWORK
		].forEach(({ name }, index) => {
			expect(listed[index]).toHaveTextContent(name);
			expect(listed[index]).toHaveTextContent(BASE_USDC_TOKEN.symbol);
		});
	});

	it('should name a token that goes by another symbol', () => {
		const { container } = renderList({
			sourceToken: BTC_MAINNET_TOKEN,
			receiveSupportedData: fromBtc
		});

		const [row, ...rest] = rows(container);

		expect(rest).toHaveLength(0);
		expect(row).toHaveTextContent(ICP_NETWORK.name);
		expect(row).toHaveTextContent(
			replacePlaceholders(en.swap.text.as_token, { $symbol: ckBtc.symbol })
		);
	});

	it('should show the balance of an enabled token, and none for one that is not', () => {
		vi.spyOn(swapDerived, 'allSwapUniverseTokens', 'get').mockReturnValue(
			readable(
				universe.map((token) =>
					token.id === POLYGON_USDC_TOKEN.id ? { ...token, enabled: false } : token
				)
			)
		);
		balancesStore.set({
			id: SOLANA_USDC_TOKEN.id,
			data: { data: 45_100_000n, certified: true }
		});

		const { container } = renderList();

		const listed = rows(container);

		expect(listed[4]).toHaveTextContent('45.1');
		expect(listed[3]).not.toHaveTextContent(/\d/);
	});

	it('should mask token and fiat balances when privacy mode is enabled', async () => {
		balancesStore.set({ id: SOLANA_USDC_TOKEN.id, data: { data: 45_100_000n, certified: true } });
		vi.spyOn(exchangesDerived, 'exchanges', 'get').mockReturnValue(
			readable({
				[SOLANA_USDC_TOKEN.id]: { usd: 1 }
			})
		);

		vi.spyOn(exchangesDerived, 'exchangeNotInitialized', 'get').mockReturnValue(readable(false));
		const { getByRole } = renderList();
		const row = getByRole('button', { name: /Solana/ });

		expect(row).toHaveTextContent('45.1');
		expect(within(row).getAllByRole('status')).toHaveLength(2);

		privacyModeStore.set({ key: 'privacy-mode', value: { enabled: true } });

		await waitFor(() => expect(row).not.toHaveTextContent('45.1'));

		expect(within(row).getAllByRole('status')).toHaveLength(1);
		expect(row.querySelector('output svg')).toBeInTheDocument();
	});

	it('should set the picked token and track the pick', async () => {
		const { getByRole } = renderList({ fromShortcut: true });

		await fireEvent.click(getByRole('button', { name: /Solana/ }));

		expect(onSelectToken).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ id: SOLANA_USDC_TOKEN.id })
		);
		expect(trackSwapReceiveShortcut).toHaveBeenCalledExactlyOnceWith({
			action: 'other_network',
			sourceToken: BASE_USDC_TOKEN,
			destinationToken: expect.objectContaining({ id: SOLANA_USDC_TOKEN.id })
		});
	});

	it.each([SOLANA_USDC_TOKEN, ETHEREUM_USDC_TOKEN])(
		'should not track a pick on $network.name when reopening the receive selector',
		async (token) => {
			const { getByRole } = renderList({ destinationToken: SOLANA_USDC_TOKEN });
			await fireEvent.click(getByRole('button', { name: new RegExp(token.network.name) }));

			expect(onSelectToken).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ id: token.id })
			);
			expect(trackSwapReceiveShortcut).not.toHaveBeenCalled();
		}
	);

	it('should mark the current destination with a check and pressed state beside its network label', () => {
		const { getByRole } = renderList({ destinationToken: SOLANA_USDC_TOKEN });
		const selected = getByRole('button', { name: /Solana/, pressed: true });
		const unselected = getByRole('button', { name: /Ethereum/, pressed: false });

		expect(selected.querySelector('svg[width="18px"]')).toBeInTheDocument();
		expect(unselected.querySelector('svg[width="18px"]')).not.toBeInTheDocument();
	});

	it('should go back without a pick', async () => {
		const { getByText } = renderList();

		await fireEvent.click(getByText(en.core.text.back));

		expect(onClose).toHaveBeenCalledOnce();
		expect(onSelectToken).not.toHaveBeenCalled();
		expect(trackSwapReceiveShortcut).not.toHaveBeenCalled();
	});

	it.each([
		{ sourceToken: ckUsdc, title: "You can't move USDC to another network right now" },
		{ sourceToken: null, title: en.swap.text.move_no_networks_title_without_symbol }
	])(
		'should show "$title" and focus Back when the network list opens empty',
		async ({ sourceToken, title }) => {
			const { getByRole, getByTestId } = renderList({
				sourceToken,
				receiveSupportedData: {
					icp: nothing,
					evm: nothing,
					sol: nothing,
					btc: nothing,
					xrp: nothing
				}
			});
			const list = getByTestId(SWAP_RECEIVE_NETWORK_LIST);
			const status = within(list).getByRole('status');
			const back = getByRole('button', { name: en.core.text.back });

			expect(status).toHaveTextContent(title);
			expect(status).toHaveTextContent(en.swap.text.move_no_networks_description);
			expect(within(list).queryByRole('button')).not.toBeInTheDocument();

			await waitFor(() => expect(back).toHaveFocus());
		}
	);
});
