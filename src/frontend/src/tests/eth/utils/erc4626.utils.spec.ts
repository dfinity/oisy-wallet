import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import {
	isTokenErc4626,
	isTokenErc4626CustomToken,
	normalizeErc4626MintBurnTransfers
} from '$eth/utils/erc4626.utils';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import type { Transaction } from '$lib/types/transaction';
import { MOCK_ERC1155_TOKENS } from '$tests/mocks/erc1155-tokens.mock';
import { MOCK_ERC721_TOKENS } from '$tests/mocks/erc721-tokens.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';

describe('erc4626.utils', () => {
	describe('isTokenErc4626', () => {
		it.each(ERC4626_TOKENS)('should return true for token $name', (token) => {
			expect(isTokenErc4626(token)).toBeTruthy();
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
			...MOCK_ERC721_TOKENS,
			...MOCK_ERC1155_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc4626(token)).toBeFalsy();
		});
	});

	describe('isTokenErc4626CustomToken', () => {
		it.each(
			ERC4626_TOKENS.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenErc4626CustomToken(token)).toBeTruthy();
		});

		it.each(ERC4626_TOKENS)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenErc4626CustomToken(token)).toBeFalsy();
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
			...MOCK_ERC721_TOKENS,
			...MOCK_ERC1155_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc4626CustomToken(token)).toBeFalsy();
		});
	});

	describe('normalizeErc4626MintBurnTransfers', () => {
		const vaultAddress = '0xVault';

		const [transaction] = createMockEthTransactions(1);

		const normalize = (transactions: Transaction[]) =>
			normalizeErc4626MintBurnTransfers({ transactions, vaultAddress });

		it('should read a share mint as coming from the vault', () => {
			const [result] = normalize([{ ...transaction, from: ZERO_ETH_ADDRESS }]);

			expect(result.from).toBe(vaultAddress);
			expect(result.to).toBe(transaction.to);
		});

		it('should read a share burn as going to the vault', () => {
			const [result] = normalize([{ ...transaction, to: ZERO_ETH_ADDRESS }]);

			expect(result.to).toBe(vaultAddress);
			expect(result.from).toBe(transaction.from);
		});

		it('should match the zero address whatever its case', () => {
			const [result] = normalize([{ ...transaction, from: ZERO_ETH_ADDRESS.toUpperCase() }]);

			expect(result.from).toBe(vaultAddress);
		});

		it('should leave a transfer between two addresses alone', () => {
			expect(normalize([transaction])).toStrictEqual([transaction]);
		});

		it('should be idempotent, so rows that already went through it are unaffected', () => {
			const once = normalize([{ ...transaction, from: ZERO_ETH_ADDRESS }]);

			expect(normalize(once)).toStrictEqual(once);
		});
	});
});
