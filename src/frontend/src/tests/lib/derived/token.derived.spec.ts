import { SUPPORTED_ARBITRUM_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { SUPPORTED_BASE_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.base.env';
import { SUPPORTED_BSC_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SUPPORTED_POLYGON_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { SUPPORTED_BITCOIN_NETWORK_IDS } from '$env/networks/networks.btc.env';
import { SUPPORTED_NETWORK_IDS, SUPPORTED_TESTNET_NETWORK_IDS } from '$env/networks/networks.env';
import { SUPPORTED_ETHEREUM_NETWORK_IDS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID, ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORK_IDS } from '$env/networks/networks.sol.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { POL_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { DEFAULT_ARBITRUM_TOKEN } from '$lib/constants/tokens.constants';
import { defaultFallbackToken } from '$lib/derived/token.derived';
import { token } from '$lib/stores/token.store';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('token.derived', () => {
	beforeEach(() => {
		token.reset();
	});

	describe('defaultFallbackToken', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			mockPage.reset();

			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');

			vi.stubEnv('VITE_BITCOIN_MAINNET_DISABLED', 'false');
		});

		it.each(SUPPORTED_BITCOIN_NETWORK_IDS)(
			`should return default token for Bitcoin network %s`,
			(networkId) => {
				mockPage.mockNetwork(networkId.description);

				expect(get(defaultFallbackToken)).toEqual(BTC_MAINNET_TOKEN);
			}
		);

		it.each(SUPPORTED_SOLANA_NETWORK_IDS)(
			`should return default token for Solana network %s`,
			(networkId) => {
				mockPage.mockNetwork(networkId.description);

				expect(get(defaultFallbackToken)).toEqual(SOLANA_TOKEN);
			}
		);

		it.each(SUPPORTED_ETHEREUM_NETWORK_IDS)(
			`should return default token for Ethereum network %s`,
			(networkId) => {
				mockPage.mockNetwork(networkId.description);

				expect(get(defaultFallbackToken)).toEqual(ETHEREUM_TOKEN);
			}
		);

		it.each(SUPPORTED_BASE_NETWORK_IDS)(
			`should return default token for Base network %s`,
			(networkId) => {
				mockPage.mockNetwork(networkId.description);

				expect(get(defaultFallbackToken)).toEqual(BASE_ETH_TOKEN);
			}
		);

		it.each(SUPPORTED_BSC_NETWORK_IDS)(
			`should return default token for BSC network %s`,
			(networkId) => {
				mockPage.mockNetwork(networkId.description);

				expect(get(defaultFallbackToken)).toEqual(BNB_MAINNET_TOKEN);
			}
		);

		it.each(SUPPORTED_POLYGON_NETWORK_IDS)(
			`should return default token for Polygon network %s`,
			(networkId) => {
				mockPage.mockNetwork(networkId.description);

				expect(get(defaultFallbackToken)).toEqual(POL_MAINNET_TOKEN);
			}
		);

		it.each(SUPPORTED_ARBITRUM_NETWORK_IDS)(
			`should return default token for Arbitrum network %s`,
			(networkId) => {
				mockPage.mockNetwork(networkId.description);

				expect(get(defaultFallbackToken)).toEqual(DEFAULT_ARBITRUM_TOKEN);
			}
		);

		it('should return ICP for ICP network', () => {
			mockPage.mockNetwork(ICP_NETWORK_ID.description);

			expect(get(defaultFallbackToken)).toEqual(ICP_TOKEN);
		});

		it('should return ICP for ICP testnet pseudo-network', () => {
			mockPage.mockNetwork(ICP_PSEUDO_TESTNET_NETWORK_ID.description);

			expect(get(defaultFallbackToken)).toEqual(ICP_TOKEN);
		});

		it('should return ETH for any other network', () => {
			mockPage.mockNetwork('mock-network');

			expect(get(defaultFallbackToken)).toEqual(ETHEREUM_TOKEN);
		});

		describe('when testnets are disabled', () => {
			beforeEach(() => {
				setupTestnetsStore('disabled');
			});

			it.each(SUPPORTED_TESTNET_NETWORK_IDS)(
				`should return default token for Bitcoin network %s`,
				(networkId) => {
					mockPage.mockNetwork(networkId.description);

					// ICP (incl. its testnet pseudo-network) is always available, so it keeps resolving to the ICP token.
					expect(get(defaultFallbackToken)).toEqual(
						isNetworkIdICP(networkId) ? ICP_TOKEN : ETHEREUM_TOKEN
					);
				}
			);
		});

		describe('when all networks are disabled', () => {
			beforeEach(() => {
				setupTestnetsStore('disabled');
				setupUserNetworksStore('allDisabled');
			});

			it.each(SUPPORTED_NETWORK_IDS)(`should return default token for network %s`, (networkId) => {
				mockPage.mockNetwork(networkId.description);

				// ICP (incl. its testnet pseudo-network) is always available, so it keeps resolving to the ICP token.
				expect(get(defaultFallbackToken)).toEqual(
					isNetworkIdICP(networkId) ? ICP_TOKEN : ETHEREUM_TOKEN
				);
			});
		});
	});
});
