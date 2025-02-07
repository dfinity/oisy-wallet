import * as btcEnv from '$env/networks/networks.btc.env';
import * as solEnv from '$env/networks/networks.sol.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { pageToken } from '$lib/derived/page-token.derived';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { get } from 'svelte/store';

describe('page-token.derived', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPage.reset();
		vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);
		vi.spyOn(solEnv, 'SOLANA_NETWORK_ENABLED', 'get').mockImplementation(() => true);

		vi.spyOn(enabledSplTokens, 'subscribe').mockImplementation((fn) => {
			fn([{ ...JUP_TOKEN, enabled: true }]);
			return () => {};
		});
	});

	it('should return undefined when no token in route', () => {
		expect(get(pageToken)).toBeUndefined();
	});

	it.each([
		['ICP token', ICP_TOKEN],
		['BTC token', BTC_MAINNET_TOKEN],
		['SOL token', SOLANA_TOKEN],
		['ETH token', ETHEREUM_TOKEN],
		['Sepolia token', SEPOLIA_TOKEN]
		// eslint-disable-next-line local-rules/prefer-object-params
	])('should find %s', (_, token) => {
		mockPage.mock({ token: token.name, network: token.network.id.description });
		expect(get(pageToken)).toBe(token);
	});

	it('should find ERC20 token', () => {
		const mockToken = { ...mockValidErc20Token, enabled: true };
		erc20UserTokensStore.setAll([{ data: mockToken, certified: true }]);
		mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

		expect(get(pageToken)?.symbol).toBe(mockToken.symbol);
	});

	it('should find ICRC token', () => {
		const mockToken = { ...mockIcrcCustomToken, enabled: true };
		icrcCustomTokensStore.setAll([{ data: mockToken, certified: true }]);
		mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

		expect(get(pageToken)?.symbol).toBe(mockToken.symbol);
	});

	it('should find SPL token', () => {
		const mockToken = JUP_TOKEN;
		mockPage.mock({ token: mockToken.name, network: mockToken.network.id.description });

		expect(get(pageToken)?.symbol).toBe(mockToken.symbol);
	});

	it('should return undefined when token is not found in any list', () => {
		mockPage.mock({ token: 'non-existent-token' });
		expect(get(pageToken)).toBeUndefined();
	});

	it('should return undefined when token name matches but network does not', () => {
		const mockToken = { ...mockValidErc20Token, enabled: true };
		mockPage.mock({ token: mockToken.name, network: 'non-existent-network' });

		expect(get(pageToken)).toBeUndefined();
	});

	it('should return undefined when token network matches but name does not', () => {
		const mockToken = { ...mockValidErc20Token, enabled: true };
		mockPage.mock({ token: 'non-existent-token', network: mockToken.network.name });

		expect(get(pageToken)).toBeUndefined();
	});
});
