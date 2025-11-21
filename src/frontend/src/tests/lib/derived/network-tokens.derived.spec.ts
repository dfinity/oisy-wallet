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
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import {
	enabledFungibleNetworkTokens,
	enabledNonFungibleNetworkTokens
} from '$lib/derived/network-tokens.derived';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import {
	AZUKI_ELEMENTAL_BEANS_TOKEN,
	DE_GODS_TOKEN,
	PUDGY_PENGUINS_TOKEN,
	SEPOLIA_PUDGY_PENGUINS_TOKEN,
	mockValidErc721Token
} from '$tests/mocks/erc721-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('network-tokens.derived', () => {
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

		erc721CustomTokensStore.resetAll();
		erc20DefaultTokensStore.reset();
		erc20UserTokensStore.resetAll();
		icrcDefaultTokensStore.resetAll();
		icrcCustomTokensStore.resetAll();
		splDefaultTokensStore.reset();
		splCustomTokensStore.resetAll();
	});

	describe('enabledFungibleNetworkTokens', () => {
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

	describe('enabledNonFungibleNetworkTokens', () => {
		it('should return all non-testnet tokens when no network is selected and testnets are disabled', () => {
			const mockCustomErc721Token = { ...mockValidErc721Token, enabled: true };

			erc721CustomTokensStore.setAll([{ data: mockCustomErc721Token, certified: false }]);

			expect(get(enabledNonFungibleNetworkTokens)).toEqual([mockCustomErc721Token]);
		});

		describe('when testnets are enabled', () => {
			const mockErc721EthereumCustomToken: Erc721CustomToken = {
				...PUDGY_PENGUINS_TOKEN,
				...toggleProps
			};

			const mockErc721SepoliaCustomToken: Erc721CustomToken = {
				...SEPOLIA_PUDGY_PENGUINS_TOKEN,
				...toggleProps
			};

			const mockErc721BaseCustomToken: Erc721CustomToken = {
				...{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: BASE_NETWORK },
				...toggleProps
			};

			const mockErc721BaseSepoliaCustomToken: Erc721CustomToken = {
				...{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: BASE_SEPOLIA_NETWORK },
				...toggleProps
			};

			const mockErc721BscCustomToken: Erc721CustomToken = {
				...{ ...DE_GODS_TOKEN, network: BSC_MAINNET_NETWORK },
				...toggleProps
			};

			const mockErc721BscTestnetCustomToken: Erc721CustomToken = {
				...{ ...DE_GODS_TOKEN, network: BSC_TESTNET_NETWORK },
				...toggleProps
			};

			const mockErc721PolygonCustomToken: Erc721CustomToken = {
				...{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: POLYGON_MAINNET_NETWORK },
				...toggleProps
			};

			const mockErc721PolygonAmoyCustomToken: Erc721CustomToken = {
				...AZUKI_ELEMENTAL_BEANS_TOKEN,
				...toggleProps
			};

			const mockErc721ArbitrumCustomToken: Erc721CustomToken = {
				...{ ...DE_GODS_TOKEN, network: ARBITRUM_MAINNET_NETWORK },
				...toggleProps
			};

			const mockErc721ArbitrumSepoliaCustomToken: Erc721CustomToken = {
				...{ ...DE_GODS_TOKEN, network: ARBITRUM_SEPOLIA_NETWORK },
				...toggleProps
			};

			const networkMap: { network: Network; tokens: Token[] }[] = [
				{
					network: ICP_NETWORK,
					tokens: []
				},
				{
					network: BTC_MAINNET_NETWORK,
					tokens: []
				},
				{
					network: ETHEREUM_NETWORK,
					tokens: [mockErc721EthereumCustomToken]
				},
				{
					network: SEPOLIA_NETWORK,
					tokens: [mockErc721SepoliaCustomToken]
				},
				{
					network: SOLANA_MAINNET_NETWORK,
					tokens: []
				},
				{
					network: SOLANA_DEVNET_NETWORK,
					tokens: []
				},
				{
					network: BASE_NETWORK,
					tokens: [mockErc721BaseCustomToken]
				},
				{
					network: BASE_SEPOLIA_NETWORK,
					tokens: [mockErc721BaseSepoliaCustomToken]
				},
				{
					network: BSC_MAINNET_NETWORK,
					tokens: [mockErc721BscCustomToken]
				},
				{
					network: BSC_TESTNET_NETWORK,
					tokens: [mockErc721BscTestnetCustomToken]
				},
				{
					network: POLYGON_MAINNET_NETWORK,
					tokens: [mockErc721PolygonCustomToken]
				},
				{
					network: POLYGON_AMOY_NETWORK,
					tokens: [mockErc721PolygonAmoyCustomToken]
				},
				{
					network: ARBITRUM_MAINNET_NETWORK,
					tokens: [mockErc721ArbitrumCustomToken]
				},
				{
					network: ARBITRUM_SEPOLIA_NETWORK,
					tokens: [mockErc721ArbitrumSepoliaCustomToken]
				}
			];

			beforeEach(() => {
				setupTestnetsStore('enabled');

				erc721CustomTokensStore.setAll([
					{ data: mockErc721EthereumCustomToken, certified: false },
					{ data: mockErc721SepoliaCustomToken, certified: false },
					{ data: mockErc721BaseCustomToken, certified: false },
					{ data: mockErc721BaseSepoliaCustomToken, certified: false },
					{ data: mockErc721BscCustomToken, certified: false },
					{ data: mockErc721BscTestnetCustomToken, certified: false },
					{ data: mockErc721PolygonCustomToken, certified: false },
					{ data: mockErc721PolygonAmoyCustomToken, certified: false },
					{ data: mockErc721ArbitrumCustomToken, certified: false },
					{ data: mockErc721ArbitrumSepoliaCustomToken, certified: false }
				]);
			});

			it('should not return testnet tokens when no network is selected', () => {
				expect(get(enabledNonFungibleNetworkTokens)).toEqual([
					mockErc721EthereumCustomToken,
					mockErc721BaseCustomToken,
					mockErc721BscCustomToken,
					mockErc721PolygonCustomToken,
					mockErc721ArbitrumCustomToken
				]);
			});

			it.each(networkMap)(
				'should return all tokens for network $network.name',
				({ network, tokens }) => {
					mockPage.mock({ network: network.id.description });

					expect(get(enabledNonFungibleNetworkTokens)).toEqual(tokens);
				}
			);
		});
	});
});
