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
import { SWAP_RECEIVE_NETWORK_LIST } from '$lib/constants/test-ids.constants';
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
import { mockContextMap } from '$tests/utils/context.test-utils';
import { fireEvent, render, within } from '@testing-library/svelte';
import { readable } from 'svelte/store';

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
		receiveSupportedData = fromBaseUsdc
	}: {
		sourceToken?: Token;
		receiveSupportedData?: SwapSupportedTokensData;
	} = {}) =>
		render(SwapReceiveNetworkList, {
			props: { onSelectToken, onClose },
			context: mockContextMap([
				[
					SWAP_CONTEXT_KEY,
					{
						sourceToken: readable(sourceToken),
						receiveSupportedData: readable(receiveSupportedData)
					}
				]
			])
		});

	const rows = (container: HTMLElement) =>
		within(container.querySelector(`[data-tid="${SWAP_RECEIVE_NETWORK_LIST}"]`) as HTMLElement)
			.getAllByRole('button')
			.map((row) =>
				[...row.querySelectorAll('.logo-button-title, .text-sm.text-tertiary')]
					.map(({ textContent }) => textContent?.trim())
					.filter(Boolean)
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

	it('should list the networks USDC on Base reaches, in chain order, without Internet Computer', () => {
		const { container } = renderList();

		expect(rows(container)).toEqual([
			['Ethereum', 'USDC'],
			['Arbitrum', 'USDC'],
			['BNB Smart Chain', 'USDC'],
			['Polygon', 'USDC'],
			['Solana', 'USDC']
		]);
	});

	it('should name a token that goes by another symbol', () => {
		const { container } = renderList({
			sourceToken: BTC_MAINNET_TOKEN,
			receiveSupportedData: fromBtc
		});

		expect(rows(container)).toEqual([['Internet Computer', 'as ckBTC']]);
	});

	it('should set the picked token and track the pick', async () => {
		const { getByRole } = renderList();

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

	it('should go back without a pick', async () => {
		const { getByText } = renderList();

		await fireEvent.click(getByText(en.core.text.cancel));

		expect(onClose).toHaveBeenCalledOnce();
		expect(onSelectToken).not.toHaveBeenCalled();
		expect(trackSwapReceiveShortcut).not.toHaveBeenCalled();
	});
});
