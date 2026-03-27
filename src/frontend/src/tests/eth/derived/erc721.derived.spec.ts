import {
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_MAINNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK, BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_MAINNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	POLYGON_MAINNET_NETWORK,
	POLYGON_MAINNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { enabledErc721Tokens, erc721CustomTokens } from '$eth/derived/erc721.derived';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { get } from 'svelte/store';

describe('erc721.derived', () => {
	const mockErc721CustomEthereumToken: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('Erc721EthereumTokenId'),
		network: ETHEREUM_NETWORK,
		symbol: 'DQH',
		address: `${mockValidErc721Token.address}1`,
		version: undefined,
		enabled: true
	};

	const mockErc721CustomPolygonToken: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('Erc721PolygonTokenId'),
		network: POLYGON_MAINNET_NETWORK,
		symbol: 'HZT',
		address: `${mockValidErc721Token.address}2`,
		version: undefined,
		enabled: true
	};

	const mockErc721CustomBaseToken: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('Erc721BaseTokenId'),
		network: BASE_NETWORK,
		symbol: 'UAJ',
		address: `${mockValidErc721Token.address}3`,
		version: undefined,
		enabled: true
	};

	const mockErc721CustomBscToken: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('Erc721BscTokenId'),
		network: BSC_MAINNET_NETWORK,
		symbol: 'BSC',
		address: `${mockValidErc721Token.address}4`,
		version: undefined,
		enabled: true
	};

	const mockErc721CustomArbitrumToken: Erc721CustomToken = {
		...mockValidErc721Token,
		id: parseTokenId('Erc721ArbitrumTokenId'),
		network: ARBITRUM_MAINNET_NETWORK,
		symbol: 'ARB',
		address: `${mockValidErc721Token.address}5`,
		version: undefined,
		enabled: true
	};

	describe('erc721CustomTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			erc721CustomTokensStore.resetAll();

			erc721CustomTokensStore.setAll([
				{ data: mockErc721CustomEthereumToken, certified: false },
				{ data: mockErc721CustomBaseToken, certified: false },
				{ data: mockErc721CustomBscToken, certified: false },
				{ data: mockErc721CustomPolygonToken, certified: false },
				{ data: mockErc721CustomArbitrumToken, certified: false }
			]);
		});

		it('should return all erc721 custom tokens', () => {
			const result = get(erc721CustomTokens);

			expect(result).toEqual([
				mockErc721CustomEthereumToken,
				mockErc721CustomBaseToken,
				mockErc721CustomBscToken,
				mockErc721CustomPolygonToken,
				mockErc721CustomArbitrumToken
			]);
		});

		it('should return enabled ethereum tokens', () => {
			vi.spyOn(userNetworks, 'subscribe').mockImplementation((fn) => {
				fn({
					[ETHEREUM_NETWORK_ID]: { enabled: true, isTestnet: false },
					[BASE_NETWORK_ID]: { enabled: false, isTestnet: false },
					[BSC_MAINNET_NETWORK_ID]: { enabled: false, isTestnet: false },
					[POLYGON_MAINNET_NETWORK_ID]: { enabled: false, isTestnet: false },
					[ARBITRUM_MAINNET_NETWORK_ID]: { enabled: false, isTestnet: false }
				});
				return () => {};
			});

			const result = get(erc721CustomTokens);

			expect(result).toEqual([mockErc721CustomEthereumToken]);
		});

		it('should return enabled evm tokens', () => {
			vi.spyOn(userNetworks, 'subscribe').mockImplementation((fn) => {
				fn({
					[ETHEREUM_NETWORK_ID]: { enabled: false, isTestnet: false },
					[BASE_NETWORK_ID]: { enabled: true, isTestnet: false },
					[BSC_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false },
					[POLYGON_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false },
					[ARBITRUM_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false }
				});
				return () => {};
			});

			const result = get(erc721CustomTokens);

			expect(result).toEqual([
				mockErc721CustomBaseToken,
				mockErc721CustomBscToken,
				mockErc721CustomPolygonToken,
				mockErc721CustomArbitrumToken
			]);
		});
	});

	describe('enabledErc721Tokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			erc721CustomTokensStore.resetAll();

			erc721CustomTokensStore.setAll([
				{ data: mockErc721CustomEthereumToken, certified: false },
				{ data: { ...mockErc721CustomBaseToken, enabled: false }, certified: false },
				{ data: mockErc721CustomBscToken, certified: false },
				{ data: mockErc721CustomPolygonToken, certified: false },
				{ data: mockErc721CustomArbitrumToken, certified: false }
			]);
		});

		it('should return only enabled tokens', () => {
			const result = get(enabledErc721Tokens);

			expect(result).toEqual([
				mockErc721CustomEthereumToken,
				mockErc721CustomBscToken,
				mockErc721CustomPolygonToken,
				mockErc721CustomArbitrumToken
			]);
		});
	});
});
