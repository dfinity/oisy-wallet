import * as btcEnv from '$env/networks.btc.env';
import {
	BTC_MAINNET_NETWORK,
	ETHEREUM_NETWORK,
	ICP_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks.env';
import * as ethEnv from '$env/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
import { testnetsStore } from '$lib/stores/settings.store';
import { mockPage } from '$tests/mocks/page.store.mock';
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

			testnetsStore.reset({ key: 'testnets' });

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		});

		it('should return all non-testnet tokens when no network is selected and testnets are disabled', () => {
			expect(get(enabledNetworkTokens)).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN]);
		});

		describe('when testnets are enabled', () => {
			const mockErc20UserToken: Erc20UserToken = {
				...PEPE_TOKEN,
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
					tokens: [SEPOLIA_TOKEN]
				}
			];

			beforeEach(() => {
				testnetsStore.set({ key: 'testnets', value: { enabled: true } });

				erc20UserTokensStore.setAll([{ data: mockErc20UserToken, certified: false }]);
			});

			it('should not return testnet tokens when no network is selected', () => {
				expect(get(enabledNetworkTokens)).toEqual([
					ICP_TOKEN,
					BTC_MAINNET_TOKEN,
					ETHEREUM_TOKEN,
					mockErc20UserToken
				]);
			});

			it.each(networkMap)('should return all tokens for %s', ({ network, tokens }) => {
				mockPage.mock({ network: network.id.description });

				expect(get(enabledNetworkTokens)).toEqual(tokens);
			});
		});
	});
});
