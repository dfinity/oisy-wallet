import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import {
	isTokenErc1155,
	isTokenErc1155CustomToken,
	replaceErc1155UriTokenId
} from '$eth/utils/erc1155.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { MOCK_ERC1155_TOKENS } from '$tests/mocks/erc1155-tokens.mock';
import { MOCK_ERC721_TOKENS } from '$tests/mocks/erc721-tokens.mock';

describe('erc1155.utils', () => {
	describe('isTokenErc1155', () => {
		it.each(MOCK_ERC1155_TOKENS)('should return true for token $name', (token) => {
			expect(isTokenErc1155(token)).toBeTruthy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...MOCK_ERC721_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc1155(token)).toBeFalsy();
		});
	});

	describe('isTokenErc1155CustomToken', () => {
		it.each(
			MOCK_ERC1155_TOKENS.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenErc1155CustomToken(token)).toBeTruthy();
		});

		it.each(MOCK_ERC1155_TOKENS)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenErc1155CustomToken(token)).toBeFalsy();
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
			...EVM_ERC20_TOKENS,
			...MOCK_ERC721_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc1155CustomToken(token)).toBeFalsy();
		});
	});

	describe('replaceErc1155UriTokenId', () => {
		const uri = 'ipfs://bafybeibtnykuscihteucyu5zv5ccmzsnt57tfpyv43zurafe2ghh6xo44i/{id}.json';

		it('should substitute the id as 64-char zero-padded lowercase hexadecimal', () => {
			expect(replaceErc1155UriTokenId({ uri, tokenId: parseNftId('1') })).toBe(
				'ipfs://bafybeibtnykuscihteucyu5zv5ccmzsnt57tfpyv43zurafe2ghh6xo44i/0000000000000000000000000000000000000000000000000000000000000001.json'
			);
		});

		it('should substitute a large id in lowercase hexadecimal', () => {
			expect(replaceErc1155UriTokenId({ uri, tokenId: parseNftId('305') })).toBe(
				'ipfs://bafybeibtnykuscihteucyu5zv5ccmzsnt57tfpyv43zurafe2ghh6xo44i/0000000000000000000000000000000000000000000000000000000000000131.json'
			);
		});

		it('should substitute every occurrence of the placeholder', () => {
			expect(
				replaceErc1155UriTokenId({
					uri: 'https://example.com/{id}/meta/{id}.json',
					tokenId: parseNftId('16')
				})
			).toBe(
				'https://example.com/0000000000000000000000000000000000000000000000000000000000000010/meta/0000000000000000000000000000000000000000000000000000000000000010.json'
			);
		});

		it('should return the URI untouched when it has no placeholder', () => {
			const staticUri = 'https://example.com/meta/1.json';

			expect(replaceErc1155UriTokenId({ uri: staticUri, tokenId: parseNftId('1') })).toBe(
				staticUri
			);
		});

		it('should fall back to the raw id when it is not a number', () => {
			expect(replaceErc1155UriTokenId({ uri, tokenId: parseNftId('abc') })).toBe(
				'ipfs://bafybeibtnykuscihteucyu5zv5ccmzsnt57tfpyv43zurafe2ghh6xo44i/abc.json'
			);
		});
	});
});
