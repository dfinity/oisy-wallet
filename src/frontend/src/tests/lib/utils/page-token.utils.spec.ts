import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { ETHEREUM_TOKEN, SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { Token } from '$lib/types/token';
import { getPageTokenIdentifier } from '$lib/utils/page-token.utils';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import {
	mockValidDip20Token,
	mockValidIcCkToken,
	mockValidIcrcToken
} from '$tests/mocks/ic-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

describe('page-token.utils', () => {
	describe('getPageTokenIdentifier', () => {
		it('should return the address for ERC tokens', () => {
			const tokens = [
				...ERC20_TWIN_TOKENS,
				...EVM_ERC20_TOKENS,
				mockValidErc20Token,
				mockValidErc721Token,
				mockValidErc1155Token
			];

			tokens.forEach((token) => {
				expect(getPageTokenIdentifier(token)).toBe(token.address);
			});
		});

		it('should return the address for SPL tokens', () => {
			const tokens = [...SPL_TOKENS, mockValidSplToken];

			tokens.forEach((token) => {
				expect(getPageTokenIdentifier(token)).toBe(token.address);
			});
		});

		it('should return the Ledger canister ID for IC tokens', () => {
			const tokens = [
				ICP_TOKEN,
				TESTICP_TOKEN,
				mockValidIcrcToken,
				mockValidDip20Token,
				mockValidIcCkToken
			];

			tokens.forEach((token) => {
				expect(getPageTokenIdentifier(token)).toBe(token.ledgerCanisterId);
			});
		});

		it('should return the canister ID for IC NFTs', () => {
			const tokens = [mockValidExtV2Token, mockValidDip721Token, mockValidIcPunksToken];

			tokens.forEach((token) => {
				expect(getPageTokenIdentifier(token)).toBe(token.canisterId);
			});
		});

		it('should return the symbol for native tokens', () => {
			const tokens = [
				...SUPPORTED_BITCOIN_TOKENS,
				...SUPPORTED_ETHEREUM_TOKENS,
				...SUPPORTED_EVM_TOKENS,
				...SUPPORTED_SOLANA_TOKENS
			];

			tokens.forEach((token) => {
				expect(getPageTokenIdentifier(token)).toBe(token.symbol);
			});
		});

		it('should return the symbol for all other tokens', () => {
			// @ts-expect-error we test this in purposes
			const mockToken1: Token = { ...ICP_TOKEN, standard: { code: 'UNKNOWN_STANDARD' } };
			const mockToken2: Token = {
				...ETHEREUM_TOKEN,
				// @ts-expect-error we test this in purposes
				standard: { code: 'ANOTHER_UNKNOWN_STANDARD' }
			};
			const tokens = [mockToken1, mockToken2];

			tokens.forEach((token) => {
				expect(getPageTokenIdentifier(token)).toBe(token.symbol);
			});
		});
	});
});
