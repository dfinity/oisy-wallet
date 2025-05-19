import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isGLDTToken, isVCHFToken, isVEURToken } from '$icp-eth/utils/token.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

describe('token.utils', () => {
	describe('isGLDTToken', () => {
		it('should return true for token GLDT', () => {
			expect(isGLDTToken({ ...mockValidIcToken, standard: 'icrc', symbol: 'GLDT' })).toBeTruthy();
		});

		it('should return false for token GLDT that is not ICRC token', () => {
			expect(isGLDTToken({ ...mockValidIcToken, symbol: 'GLDT' })).toBeFalsy();

			expect(isGLDTToken({ ...mockValidIcToken, standard: 'erc20', symbol: 'GLDT' })).toBeFalsy();
		});

		it('should return false for ICRC tokens that is not token GLDT', () => {
			expect(
				isGLDTToken({ ...mockValidIcToken, standard: 'icrc', symbol: 'not-GLDT' })
			).toBeFalsy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...SPL_TOKENS
		])('should return false for token $name', (token) => {
			expect(isGLDTToken(token)).toBeFalsy();
		});
	});

	describe('isVCHFToken', () => {
		it('should return true for token VCHF', () => {
			expect(isVCHFToken({ ...mockValidIcToken, standard: 'icrc', symbol: 'VCHF' })).toBeTruthy();
		});

		it('should return false for token VCHF that is not ICRC token', () => {
			expect(isVCHFToken({ ...mockValidIcToken, symbol: 'VCHF' })).toBeFalsy();

			expect(isVCHFToken({ ...mockValidIcToken, standard: 'erc20', symbol: 'VCHF' })).toBeFalsy();
		});

		it('should return false for ICRC tokens that is not token VCHF', () => {
			expect(
				isVCHFToken({ ...mockValidIcToken, standard: 'icrc', symbol: 'not-VCHF' })
			).toBeFalsy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...SPL_TOKENS
		])('should return false for token $name', (token) => {
			expect(isVCHFToken(token)).toBeFalsy();
		});
	});

	describe('isVEURToken', () => {
		it('should return true for token VEUR', () => {
			expect(isVEURToken({ ...mockValidIcToken, standard: 'icrc', symbol: 'VEUR' })).toBeTruthy();
		});

		it('should return false for token VEUR that is not ICRC token', () => {
			expect(isVEURToken({ ...mockValidIcToken, symbol: 'VEUR' })).toBeFalsy();

			expect(isVEURToken({ ...mockValidIcToken, standard: 'erc20', symbol: 'VEUR' })).toBeFalsy();
		});

		it('should return false for ICRC tokens that is not token VEUR', () => {
			expect(
				isVEURToken({ ...mockValidIcToken, standard: 'icrc', symbol: 'not-VEUR' })
			).toBeFalsy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...SPL_TOKENS
		])('should return false for token $name', (token) => {
			expect(isVEURToken(token)).toBeFalsy();
		});
	});
});
