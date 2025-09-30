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
import { enabledErc1155Tokens, erc1155CustomTokens } from '$eth/derived/erc1155.derived';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { get } from 'svelte/store';

describe('erc1155.derived', () => {
	const mockErc1155CustomEthereumToken: Erc1155CustomToken = {
		...mockValidErc1155Token,
		id: parseTokenId('Erc1155EthereumTokenId'),
		network: ETHEREUM_NETWORK,
		symbol: 'DQH',
		address: `${mockValidErc1155Token.address}1`,
		version: undefined,
		enabled: true
	};

	const mockErc1155CustomPolygonToken: Erc1155CustomToken = {
		...mockValidErc1155Token,
		id: parseTokenId('Erc1155PolygonTokenId'),
		network: POLYGON_MAINNET_NETWORK,
		symbol: 'HZT',
		address: `${mockValidErc1155Token.address}2`,
		version: undefined,
		enabled: true
	};

	const mockErc1155CustomBaseToken: Erc1155CustomToken = {
		...mockValidErc1155Token,
		id: parseTokenId('Erc1155BaseTokenId'),
		network: BASE_NETWORK,
		symbol: 'UAJ',
		address: `${mockValidErc1155Token.address}3`,
		version: undefined,
		enabled: true
	};

	const mockErc1155CustomBscToken: Erc1155CustomToken = {
		...mockValidErc1155Token,
		id: parseTokenId('Erc1155BscTokenId'),
		network: BSC_MAINNET_NETWORK,
		symbol: 'BSC',
		address: `${mockValidErc1155Token.address}4`,
		version: undefined,
		enabled: true
	};

	const mockErc1155CustomArbitrumToken: Erc1155CustomToken = {
		...mockValidErc1155Token,
		id: parseTokenId('Erc1155ArbitrumTokenId'),
		network: ARBITRUM_MAINNET_NETWORK,
		symbol: 'ARB',
		address: `${mockValidErc1155Token.address}5`,
		version: undefined,
		enabled: true
	};

	describe('erc1155CustomTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			erc1155CustomTokensStore.resetAll();

			erc1155CustomTokensStore.setAll([
				{ data: mockErc1155CustomEthereumToken, certified: false },
				{ data: mockErc1155CustomBaseToken, certified: false },
				{ data: mockErc1155CustomBscToken, certified: false },
				{ data: mockErc1155CustomPolygonToken, certified: false },
				{ data: mockErc1155CustomArbitrumToken, certified: false }
			]);
		});

		it('should return all erc1155 custom tokens', () => {
			const result = get(erc1155CustomTokens);

			expect(result).toEqual([
				mockErc1155CustomEthereumToken,
				mockErc1155CustomBaseToken,
				mockErc1155CustomBscToken,
				mockErc1155CustomPolygonToken,
				mockErc1155CustomArbitrumToken
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

			const result = get(erc1155CustomTokens);

			expect(result).toEqual([mockErc1155CustomEthereumToken]);
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

			const result = get(erc1155CustomTokens);

			expect(result).toEqual([
				mockErc1155CustomBaseToken,
				mockErc1155CustomBscToken,
				mockErc1155CustomPolygonToken,
				mockErc1155CustomArbitrumToken
			]);
		});
	});

	describe('enabledErc1155Tokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			erc1155CustomTokensStore.resetAll();

			erc1155CustomTokensStore.setAll([
				{ data: mockErc1155CustomEthereumToken, certified: false },
				{ data: { ...mockErc1155CustomBaseToken, enabled: false }, certified: false },
				{ data: mockErc1155CustomBscToken, certified: false },
				{ data: mockErc1155CustomPolygonToken, certified: false },
				{ data: mockErc1155CustomArbitrumToken, certified: false }
			]);
		});

		it('should return only enabled tokens', () => {
			const result = get(enabledErc1155Tokens);

			expect(result).toEqual([
				mockErc1155CustomEthereumToken,
				mockErc1155CustomBscToken,
				mockErc1155CustomPolygonToken,
				mockErc1155CustomArbitrumToken
			]);
		});
	});
});
