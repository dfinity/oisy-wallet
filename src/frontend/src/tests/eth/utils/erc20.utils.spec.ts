import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { EthereumNetwork } from '$eth/types/network';
import {
	isTokenErc20,
	isTokenErc20UserToken,
	isTokenEthereumUserToken,
	mapErc20Token,
	mapErc20UserToken
} from '$eth/utils/erc20.utils';
import icpDark from '$icp/assets/icp-dark.svg';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';

describe('erc20.utils', () => {
	const iconCases = [
		['icp', icpDark],
		['ckicp', icpDark],
		['unknown', undefined],
		['OTHER', undefined]
	] as const;

	describe('mapErc20Token', () => {
		const mockId = parseTokenId('mock-id');

		const mockParams = {
			id: mockId,
			name: 'TokenName',
			symbol: 'ckICP',
			address: mockValidErc20Token.address,
			exchange: mockValidErc20Token.exchange,
			decimals: mockValidErc20Token.decimals,
			network: mockValidErc20Token.network as EthereumNetwork,
			category: mockValidErc20Token.category
		};

		it('should map an ERC20 token correctly', () => {
			expect(mapErc20Token(mockParams)).toEqual({
				...mockValidErc20Token,
				id: mockId,
				standard: 'erc20',
				name: 'TokenName',
				symbol: 'ckICP',
				icon: icpDark
			});
		});

		it('should map an ERC20 token correctly when the id is not provided', () => {
			const { id: _, ...params } = mockParams;

			expect(mapErc20Token(params).id.description).toBe('ckICP');
		});

		it.each(iconCases)(
			'should return correct icon for symbol %s and not case-sensitive',
			// eslint-disable-next-line local-rules/prefer-object-params -- It is a simple list of cases
			(symbol, expectedIcon) => {
				expect(mapErc20Token({ ...mockParams, symbol }).icon).toBe(expectedIcon);

				expect(mapErc20Token({ ...mockParams, symbol: symbol.toLowerCase() }).icon).toBe(
					expectedIcon
				);

				expect(mapErc20Token({ ...mockParams, symbol: symbol.toUpperCase() }).icon).toBe(
					expectedIcon
				);

				const mixCaseSymbol = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();

				expect(mapErc20Token({ ...mockParams, symbol: mixCaseSymbol }).icon).toBe(expectedIcon);
			}
		);
	});

	describe('mapErc20UserToken', () => {
		const mockId = parseTokenId('mock-id');

		const mockParams = {
			id: mockId,
			name: 'TokenName',
			symbol: 'ckICP',
			enabled: true,
			address: mockValidErc20Token.address,
			exchange: mockValidErc20Token.exchange,
			decimals: mockValidErc20Token.decimals,
			network: mockValidErc20Token.network as EthereumNetwork,
			category: mockValidErc20Token.category
		};

		it('should map an ERC20 user token correctly', () => {
			expect(mapErc20UserToken(mockParams)).toEqual({
				...mockValidErc20Token,
				id: mockId,
				standard: 'erc20',
				name: 'TokenName',
				symbol: 'ckICP',
				enabled: true,
				icon: icpDark
			});
		});

		it('should map an ERC20 user token correctly when the id is not provided', () => {
			const { id: _, ...params } = mockParams;

			expect(mapErc20UserToken(params).id.description).toBe(
				`user-token#ckICP#${params.network.chainId}`
			);
		});

		it.each(iconCases)(
			'should return correct icon for symbol %s and not case-sensitive',
			// eslint-disable-next-line local-rules/prefer-object-params -- It is a simple list of cases
			(symbol, expectedIcon) => {
				expect(mapErc20UserToken({ ...mockParams, symbol }).icon).toBe(expectedIcon);

				expect(mapErc20UserToken({ ...mockParams, symbol: symbol.toLowerCase() }).icon).toBe(
					expectedIcon
				);

				expect(mapErc20UserToken({ ...mockParams, symbol: symbol.toUpperCase() }).icon).toBe(
					expectedIcon
				);

				const mixCaseSymbol = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();

				expect(mapErc20UserToken({ ...mockParams, symbol: mixCaseSymbol }).icon).toBe(expectedIcon);
			}
		);
	});

	describe('isTokenEthereumUserToken', () => {
		const tokens = [
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		];

		it.each(
			tokens.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenEthereumUserToken(token)).toBeTruthy();
		});

		it.each(tokens)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenEthereumUserToken(token)).toBeFalsy();
			}
		);

		it.each([ICP_TOKEN, ...SUPPORTED_BITCOIN_TOKENS, ...SUPPORTED_SOLANA_TOKENS, ...SPL_TOKENS])(
			'should return false for token $name',
			(token) => {
				expect(isTokenEthereumUserToken(token)).toBeFalsy();
			}
		);
	});

	describe('isTokenErc20UserToken', () => {
		const tokens = [...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS];

		it.each(
			tokens.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenErc20UserToken(token)).toBeTruthy();
		});

		it.each(
			tokens.map(({ exchange: _, ...token }) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return false for token $name that has not the exchange field', (token) => {
			expect(isTokenErc20UserToken(token)).toBeFalsy();
		});

		it.each(
			tokens.map(({ address: _, ...token }) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return false for token $name that has not the address field', (token) => {
			expect(isTokenErc20UserToken(token)).toBeFalsy();
		});

		it.each(tokens)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenErc20UserToken(token)).toBeFalsy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc20UserToken(token)).toBeFalsy();
		});
	});

	describe('isTokenErc20', () => {
		it.each([...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS])(
			'should return true for token $name',
			(token) => {
				expect(isTokenErc20(token)).toBeTruthy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc20(token)).toBeFalsy();
		});
	});
});
