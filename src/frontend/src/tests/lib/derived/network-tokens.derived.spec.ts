import { page } from '$app/stores';
import * as btcEnv from '$env/networks.btc.env';
import {
	BTC_MAINNET_NETWORK,
	ETHEREUM_NETWORK,
	ICP_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks.env';
import * as ethEnv from '$env/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens-erc20/tokens.pepe.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';
import { testnetsStore } from '$lib/stores/settings.store';
import { mockPageData } from '$tests/mocks/page.store.mock';
import { get, readable } from 'svelte/store';
import { expect } from 'vitest';

describe('network-tokens.derived', () => {
	describe('enabledNetworkTokens', () => {
		const toggleProps = {
			version: undefined,
			enabled: true
		};

		beforeEach(() => {
			vi.resetAllMocks();

			erc20DefaultTokensStore.reset();
			erc20UserTokensStore.resetAll();
			icrcDefaultTokensStore.resetAll();
			icrcCustomTokensStore.resetAll();

			testnetsStore.reset({ key: 'testnets' });

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		});

		it('should return all non-testnet tokens when no network is selected', () => {
			const mockStore = readable(mockPageData({}));
			vi.spyOn(page, 'subscribe').mockImplementationOnce(mockStore.subscribe);

			expect(get(enabledNetworkTokens)).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN]);
		});

		it('should not return testnet tokens when testnets are enabled and no network is selected', () => {
			const mockStore = readable(mockPageData({}));
			vi.spyOn(page, 'subscribe').mockImplementationOnce(mockStore.subscribe);

			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledNetworkTokens)).toEqual([ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN]);
		});

		it('should return the tokens for a selected network (even testnet)', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			const mockEr20UserToken: Erc20UserToken = {
				...PEPE_TOKEN,
				...toggleProps
			};

			erc20UserTokensStore.setAll([{ data: mockEr20UserToken, certified: false }]);

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
					tokens: [ETHEREUM_TOKEN, mockEr20UserToken]
				},
				{
					network: SEPOLIA_NETWORK,
					tokens: [SEPOLIA_TOKEN]
				}
			];

			networkMap.forEach(({ network, tokens }) => {
				const mockStore = readable(mockPageData({ network: network.id.description }));
				vi.spyOn(page, 'subscribe').mockImplementation(mockStore.subscribe);

				expect(get(enabledNetworkTokens)).toEqual(tokens);
			});
		});
	});
});
