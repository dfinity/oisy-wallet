import * as btcEnv from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_NETWORK,
	ETHEREUM_NETWORK,
	ICP_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.env';
import * as ethEnv from '$env/networks/networks.eth.env';
import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { SEPOLIA_LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { DEVNET_EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { splUserTokensStore } from '$sol/stores/spl-user-tokens.store';
import type { SplUserToken } from '$sol/types/spl-user-token';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
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

			erc20DefaultTokensStore.reset();
			erc20UserTokensStore.resetAll();
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();
			splDefaultTokensStore.reset();
			splUserTokensStore.resetAll();

			setupTestnetsStore('reset');

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		});

		it('should return all non-testnet tokens when no network is selected and testnets are disabled', () => {
			expect(get(enabledNetworkTokens)).toEqual([
				ICP_TOKEN,
				BTC_MAINNET_TOKEN,
				ETHEREUM_TOKEN,
				SOLANA_TOKEN
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

			const mockSplUserToken: SplUserToken = {
				...BONK_TOKEN,
				...toggleProps
			};

			const mockSplDevnetUserToken: SplUserToken = {
				...DEVNET_EURC_TOKEN,
				...toggleProps
			};

			const networkMap = [
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
					tokens: [SOLANA_TOKEN, mockSplUserToken]
				},
				{
					network: SOLANA_TESTNET_NETWORK,
					tokens: [SOLANA_TESTNET_TOKEN]
				},
				{
					network: SOLANA_DEVNET_NETWORK,
					tokens: [SOLANA_DEVNET_TOKEN, mockSplDevnetUserToken]
				}
			];

			beforeEach(() => {
				setupTestnetsStore('enabled');

				erc20UserTokensStore.setAll([
					{ data: mockErc20UserToken, certified: false },
					{ data: mockErc20SepoliaUserToken, certified: false }
				]);
				splUserTokensStore.setAll([
					{ data: mockSplUserToken, certified: false },
					{ data: mockSplDevnetUserToken, certified: false }
				]);
			});

			it('should not return testnet tokens when no network is selected', () => {
				expect(get(enabledNetworkTokens)).toEqual([
					ICP_TOKEN,
					BTC_MAINNET_TOKEN,
					ETHEREUM_TOKEN,
					SOLANA_TOKEN,
					mockErc20UserToken,
					mockSplUserToken
				]);
			});

			it.each(networkMap)('should return all tokens for %s', ({ network, tokens }) => {
				mockPage.mock({ network: network.id.description });

				expect(get(enabledNetworkTokens)).toEqual(tokens);
			});
		});
	});
});
