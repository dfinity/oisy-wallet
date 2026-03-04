import type { EthAddress } from '$eth/types/address';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import {
	filterSpamErc20Transfers,
	hasBalanceChanged
} from '$eth/utils/eth-transactions-spam.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Transaction } from '$lib/types/transaction';

describe('eth-transactions-spam.utils', () => {
	describe('filterSpamErc20Transfers', () => {
		const userAddress = '0xabc123';
		const attackerAddress = '0xattacker';

		const baseTx: Transaction = {
			blockNumber: 100,
			from: '0xsomeone',
			to: userAddress,
			timestamp: 1700000000,
			nonce: 0,
			gasLimit: ZERO,
			value: ZERO,
			chainId: 1n,
			data: '0xbase'
		};

		const makeTx = (overrides: Partial<Transaction>): Transaction => ({
			...baseTx,
			...overrides
		});

		it('should drop zero-value transfers from non-user senders', async () => {
			const getTransactionSender = vi.fn().mockResolvedValue(attackerAddress);

			const txs = [
				makeTx({ hash: '0xa', value: 100n }),
				makeTx({ hash: '0xspam', value: ZERO, from: userAddress, to: attackerAddress })
			];

			const result = await filterSpamErc20Transfers({
				transactions: txs,
				userAddress,
				getTransactionSender
			});

			expect(result).toStrictEqual([txs[0]]);

			expect(getTransactionSender).toHaveBeenCalledExactlyOnceWith('0xspam');
		});

		it('should keep zero-value transfers initiated by the user', async () => {
			const getTransactionSender = vi.fn().mockResolvedValue(userAddress);

			const txs = [makeTx({ hash: '0xa', value: 100n }), makeTx({ hash: '0xself', value: ZERO })];

			const result = await filterSpamErc20Transfers({
				transactions: txs,
				userAddress,
				getTransactionSender
			});

			expect(result).toStrictEqual(txs);

			expect(getTransactionSender).toHaveBeenCalledExactlyOnceWith('0xself');
		});

		it('should handle case-insensitive address comparison for self-transfer', async () => {
			const getTransactionSender = vi.fn().mockResolvedValue(userAddress.toUpperCase());

			const txs = [makeTx({ hash: '0xself', value: ZERO })];

			const result = await filterSpamErc20Transfers({
				transactions: txs,
				userAddress: userAddress.toLowerCase(),
				getTransactionSender
			});

			expect(result).toStrictEqual(txs);
		});

		it('should keep zero-value transfers when getTransactionSender throws', async () => {
			const getTransactionSender = vi.fn().mockRejectedValue(new Error('RPC error'));

			const txs = [makeTx({ hash: '0xfail', value: ZERO })];

			const result = await filterSpamErc20Transfers({
				transactions: txs,
				userAddress,
				getTransactionSender
			});

			expect(result).toStrictEqual(txs);
		});

		it('should keep zero-value transfers without a hash', async () => {
			const getTransactionSender = vi.fn().mockResolvedValue(userAddress);

			const txs = [makeTx({ hash: undefined, value: ZERO })];

			const result = await filterSpamErc20Transfers({
				transactions: txs,
				userAddress,
				getTransactionSender
			});

			expect(result).toStrictEqual(txs);

			expect(getTransactionSender).not.toHaveBeenCalled();
		});

		it('should return all non-zero when there are no zero-value transfers', async () => {
			const getTransactionSender = vi.fn();

			const txs = [makeTx({ hash: '0xa', value: 1n }), makeTx({ hash: '0xb', value: 2n })];

			const result = await filterSpamErc20Transfers({
				transactions: txs,
				userAddress,
				getTransactionSender
			});

			expect(result).toStrictEqual(txs);

			expect(getTransactionSender).not.toHaveBeenCalled();
		});

		it('should filter a realistic address-poisoning batch like the Base scam tx', async () => {
			const getTransactionSender = vi.fn().mockResolvedValue(attackerAddress);

			const legitimateTxs = [
				makeTx({ hash: '0xlegit1', value: 1_000_000n, from: '0xsender1', to: userAddress }),
				makeTx({ hash: '0xlegit2', value: 500_000n, from: userAddress, to: '0xrecipient' })
			];

			const spamTxs = Array.from({ length: 100 }, (_, i) =>
				makeTx({
					hash: `0xspam${i}`,
					value: ZERO,
					from: userAddress,
					to: `0xpoisoned${i}`
				})
			);

			const result = await filterSpamErc20Transfers({
				transactions: [...legitimateTxs, ...spamTxs],
				userAddress,
				getTransactionSender
			});

			expect(result).toStrictEqual(legitimateTxs);
		});

		it('should call getTransactionSender only once per unique hash (memoization)', async () => {
			const getTransactionSender = vi.fn().mockResolvedValue(attackerAddress);

			const sharedHash = '0xbatch';
			const txs = Array.from({ length: 50 }, (_, i) =>
				makeTx({
					hash: sharedHash,
					value: ZERO,
					from: userAddress,
					to: `0xpoisoned${i}`
				})
			);

			const result = await filterSpamErc20Transfers({
				transactions: txs,
				userAddress,
				getTransactionSender
			});

			expect(result).toHaveLength(0);
			expect(getTransactionSender).toHaveBeenCalledExactlyOnceWith(sharedHash);
		});

		it('should memoize per hash with a mix of shared and unique hashes', async () => {
			const getTransactionSender = vi.fn().mockResolvedValue(attackerAddress);

			const txs = [
				makeTx({ hash: '0xbatchA', value: ZERO, to: '0x1' }),
				makeTx({ hash: '0xbatchA', value: ZERO, to: '0x2' }),
				makeTx({ hash: '0xbatchA', value: ZERO, to: '0x3' }),
				makeTx({ hash: '0xbatchB', value: ZERO, to: '0x4' }),
				makeTx({ hash: '0xbatchB', value: ZERO, to: '0x5' }),
				makeTx({ hash: '0xsingle', value: ZERO, to: '0x6' })
			];

			await filterSpamErc20Transfers({
				transactions: txs,
				userAddress,
				getTransactionSender
			});

			expect(getTransactionSender).toHaveBeenCalledTimes(3);
			expect(getTransactionSender).toHaveBeenCalledWith('0xbatchA');
			expect(getTransactionSender).toHaveBeenCalledWith('0xbatchB');
			expect(getTransactionSender).toHaveBeenCalledWith('0xsingle');
		});
	});

	describe('hasBalanceChanged', () => {
		const contract: Erc20ContractAddress = { address: '0xUSDC' };
		const address: EthAddress = '0xuser';
		const blockNumber = 42000000;

		it('should return true when balance changed', async () => {
			const getBalanceAtBlock = vi
				.fn()
				.mockImplementation(({ blockTag }) =>
					Promise.resolve(blockTag === blockNumber - 1 ? 1000n : 1500n)
				);

			const changed = await hasBalanceChanged({
				contract,
				address,
				blockNumber,
				getBalanceAtBlock
			});

			expect(changed).toBeTruthy();

			expect(getBalanceAtBlock).toHaveBeenCalledTimes(2);
			expect(getBalanceAtBlock).toHaveBeenNthCalledWith(1, {
				contract,
				address,
				blockTag: blockNumber - 1
			});
			expect(getBalanceAtBlock).toHaveBeenNthCalledWith(2, {
				contract,
				address,
				blockTag: blockNumber
			});
		});

		it('should return false when balance did not change', async () => {
			const getBalanceAtBlock = vi.fn().mockResolvedValue(1000n);

			const changed = await hasBalanceChanged({
				contract,
				address,
				blockNumber,
				getBalanceAtBlock
			});

			expect(changed).toBeFalsy();
		});

		it('should return false when balance is zero at both blocks', async () => {
			const getBalanceAtBlock = vi.fn().mockResolvedValue(ZERO);

			const changed = await hasBalanceChanged({
				contract,
				address,
				blockNumber,
				getBalanceAtBlock
			});

			expect(changed).toBeFalsy();
		});
	});
});
