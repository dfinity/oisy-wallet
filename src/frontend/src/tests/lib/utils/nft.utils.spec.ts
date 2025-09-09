import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { getTokensByNetwork, isTokenFungible, isTokenNonFungible } from '$lib/utils/nft.utils';
import { MOCK_ERC1155_TOKENS } from '$tests/mocks/erc1155-tokens.mock';
import {
	AZUKI_ELEMENTAL_BEANS_TOKEN,
	DE_GODS_TOKEN,
	MOCK_ERC721_TOKENS,
	PUDGY_PENGUINS_TOKEN
} from '$tests/mocks/erc721-tokens.mock';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';

describe('nft.utils', () => {
	describe('isTokenNonFungible', () => {
		it.each([...MOCK_ERC721_TOKENS, ...MOCK_ERC1155_TOKENS])(
			'should return true for token $name',
			(token) => {
				expect(isTokenNonFungible(token)).toBeTruthy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenNonFungible(token)).toBeFalsy();
		});
	});

	describe('isTokenFungible', () => {
		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return true for token $name', (token) => {
			expect(isTokenFungible(token)).toBeTruthy();
		});

		it.each([...MOCK_ERC721_TOKENS, ...MOCK_ERC1155_TOKENS])(
			'should return false for token $name',
			(token) => {
				expect(isTokenFungible(token)).toBeFalsy();
			}
		);
	});

	describe('getTokensByNetwork', () => {
		it('should return an empty map if no tokens are provided', () => {
			const result = getTokensByNetwork([])

			expect(result.size).toEqual(0)
		})

		it('should return the tokens grouped by networks', () => {
			const result = getTokensByNetwork([AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN, PUDGY_PENGUINS_TOKEN])

			expect(result.size).toEqual(2)

			const polygonTokens = result.get(POLYGON_AMOY_NETWORK.id);

			expect(polygonTokens).toBeDefined();
			expect(polygonTokens).toHaveLength(2);
			expect(polygonTokens).toContain(AZUKI_ELEMENTAL_BEANS_TOKEN);
			expect(polygonTokens).toContain(DE_GODS_TOKEN);

			const ethereumTokens = result.get(ETHEREUM_NETWORK.id);

			expect(ethereumTokens).toBeDefined();
			expect(ethereumTokens).toHaveLength(1);
			expect(ethereumTokens).toContain(PUDGY_PENGUINS_TOKEN);
		});
	});
});
