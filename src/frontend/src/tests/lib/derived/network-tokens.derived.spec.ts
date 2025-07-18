import {
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	POLYGON_AMOY_NETWORK,
	POLYGON_MAINNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.polygon.env';
import * as btcEnv from '$env/networks/networks.btc.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import * as solEnv from '$env/networks/networks.sol.env';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SEPOLIA_LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import {
	ARBITRUM_ETH_TOKEN,
	ARBITRUM_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import {
	BASE_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN,
	BNB_TESTNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import {
	POL_AMOY_TOKEN,
	POL_MAINNET_TOKEN
} from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { DEVNET_EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('network-tokens.derived', () => {
	describe('enabledNetworkTokens', () => {
		const toggleProps = {
			version: undefined,
			enabled: true
		};

		beforeEach(() => {
			vi.resetAllMocks();

			mockPage.reset();

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);
			vi.spyOn(solEnv, 'SOL_MAINNET_ENABLED', 'get').mockImplementation(() => true);

			setupTestnetsStore('reset');
			setupUserNetworksStore('allEnabled');

			erc20DefaultTokensStore.reset();
			erc20UserTokensStore.resetAll();
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();
			splDefaultTokensStore.reset();
			splCustomTokensStore.resetAll();
		});

		it('should return all non-testnet tokens when no network is selected and testnets are disabled', () => {
			expect(get(enabledFungibleNetworkTokens)).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				SOLANA_TOKEN,
				BASE_ETH_TOKEN,
				BNB_MAINNET_TOKEN,
				POL_MAINNET_TOKEN,
				ARBITRUM_ETH_TOKEN
			]);
		});

		describe('when testnets are enabled', () => {
			const mockErc20UserToken: Erc20UserToken = {
				...PEPE_TOKEN,
				...toggleProps
			};

			const mockErc20SepoliaUserToken: Erc20UserToken = {
				...SEPOLIA_LINK_TOKEN,
				...toggleProps
			};

			const mockSplCustomToken: SplCustomToken = {
				...BONK_TOKEN,
				...toggleProps
			};

			const mockSplDevnetCustomToken: SplCustomToken = {
				...DEVNET_EURC_TOKEN,
				...toggleProps
			};

			const networkMap: { network: Network; tokens: Token[] }[] = [
				{
					network: ICP_NETWORK,
					tokens: [ICP_TOKEN]
				},
				{
					network: BTC_MAINNET_NETWORK,
					tokens: [BTC_MAINNET_TOKEN]
				},
				{
					network: ETHEREUM_NETWORK,
					tokens: [ETHEREUM_TOKEN, mockErc20UserToken]
				},
				{
					network: SEPOLIA_NETWORK,
					tokens: [SEPOLIA_TOKEN, mockErc20SepoliaUserToken]
				},
				{
					network: SOLANA_MAINNET_NETWORK,
					tokens: [SOLANA_TOKEN, mockSplCustomToken]
				},
				{
					network: SOLANA_DEVNET_NETWORK,
					tokens: [SOLANA_DEVNET_TOKEN, mockSplDevnetCustomToken]
				},
				{
					network: BASE_NETWORK,
					tokens: [BASE_ETH_TOKEN]
				},
				{
					network: BASE_SEPOLIA_NETWORK,
					tokens: [BASE_SEPOLIA_ETH_TOKEN]
				},
				{
					network: BSC_MAINNET_NETWORK,
					tokens: [BNB_MAINNET_TOKEN]
				},
				{
					network: BSC_TESTNET_NETWORK,
					tokens: [BNB_TESTNET_TOKEN]
				},
				{
					network: POLYGON_MAINNET_NETWORK,
					tokens: [POL_MAINNET_TOKEN]
				},
				{
					network: POLYGON_AMOY_NETWORK,
					tokens: [POL_AMOY_TOKEN]
				},
				{
					network: ARBITRUM_MAINNET_NETWORK,
					tokens: [ARBITRUM_ETH_TOKEN]
				},
				{
					network: ARBITRUM_SEPOLIA_NETWORK,
					tokens: [ARBITRUM_SEPOLIA_ETH_TOKEN]
				}
			];

			beforeEach(() => {
				setupTestnetsStore('enabled');

				erc20UserTokensStore.setAll([
					{ data: mockErc20UserToken, certified: false },
					{ data: mockErc20SepoliaUserToken, certified: false }
				]);
				splCustomTokensStore.setAll([
					{ data: mockSplCustomToken, certified: false },
					{ data: mockSplDevnetCustomToken, certified: false }
				]);
			});

			it('should not return testnet tokens when no network is selected', () => {
				expect(get(enabledFungibleNetworkTokens)).toEqual([
					ICP_TOKEN,
					BTC_MAINNET_TOKEN,
					ETHEREUM_TOKEN,
					SOLANA_TOKEN,
					BASE_ETH_TOKEN,
					BNB_MAINNET_TOKEN,
					POL_MAINNET_TOKEN,
					ARBITRUM_ETH_TOKEN,
					mockErc20UserToken,
					mockSplCustomToken
				]);
			});

			it.each(networkMap)(
				'should return all tokens for network $network.name',
				({ network, tokens }) => {
					mockPage.mock({ network: network.id.description });

					expect(get(enabledFungibleNetworkTokens)).toEqual(tokens);
				}
			);
		});
	});
});
