import type { EthAddress } from '$eth/types/address';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import { ZERO } from '$lib/constants/app.constants';
import type { Transaction } from '$lib/types/transaction';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Filters zero-value spam transfers from a list of ERC-20 transactions.
 *
 * Zero-value ERC-20 Transfer events are a common address-poisoning technique:
 * an attacker batch-emits real `Transfer(from, to, 0)` logs to pollute the
 * recipient's activity feed in wallets and block explorers.
 *
 * The transfer is technically valid (it lives on-chain and the receipt succeeds)
 * but it moves zero tokens, so no balance ever changes.
 *
 * This utility detects and filters such spam. The full rule set:
 *
 *   value > 0                             → show
 *   value == 0  AND  txSender == me       → show (self-initiated maintenance)
 *   value == 0  AND  txSender != me       → hide (spam)
 *
 * The "txSender" is the outer transaction's `from` (the EOA that signed the tx),
 * NOT the `Transfer` event's `from`. The only reliable way to obtain it is via
 * `eth_getTransactionByHash`.
 *
 */
export const filterSpamErc20Transfers = async ({
	transactions,
	userAddress,
	getTransactionSender
}: {
	transactions: Transaction[];
	userAddress: string;
	getTransactionSender: (hash: string) => Promise<EthAddress | undefined>;
}): Promise<Transaction[]> => {
	const { nonZero, zeroValue } = transactions.reduce<{
		nonZero: Transaction[];
		zeroValue: Transaction[];
	}>(
		(acc, tx) => {
			if (tx.value === ZERO) {
				acc.zeroValue.push(tx);
			} else {
				acc.nonZero.push(tx);
			}

			return acc;
		},
		{
			nonZero: [],
			zeroValue: []
		}
	);

	if (zeroValue.length === 0) {
		return nonZero;
	}

	const kept = await Promise.all(
		zeroValue.map(async (tx): Promise<Transaction | undefined> => {
			if (isNullish(tx.hash)) {
				// No hash available: we cannot look up the sender, so err on the side of showing.
				return tx;
			}

			try {
				const sender = await getTransactionSender(tx.hash);

				// If the sender cannot be determined (e.g. tx pruned / not found),
				// err on the side of showing the transfer, same as the catch branch.
				if (isNullish(sender)) {
					return tx;
				}
				if (areAddressesEqual({ address1: sender, address2: userAddress, addressType: 'Eth' })) {
					return tx;
				}
			} catch (_: unknown) {
				// If the RPC call fails we err on the side of showing the transfer.
				return tx;
			}
		})
	);

	return [...nonZero, ...kept.filter(nonNullish)];
};

/**
 * Stronger spam rule: verifies that a transfer actually changed the recipient's
 * balance by comparing `balanceOf` at `blockNumber` vs `blockNumber - 1`.
 *
 * Catches non-standard "log-only" scam tokens that emit Transfer events but
 * never update balances, as well as ordinary zero-value spam.
 *
 * Requires two `eth_call` RPCs per invocation, so use selectively (e.g. only
 * for transfers that look suspicious).
 *
 * Caveat: rebasing tokens legitimately change balances without transfers.
 * For standard tokens like USDC on Base this is not a concern, but for
 * arbitrary tokens treat the result as a strong signal rather than absolute
 * proof.
 */
// TODO: use this rule in the checks above
export const hasBalanceChanged = async ({
	contract,
	address,
	blockNumber,
	getBalanceAtBlock
}: {
	contract: Erc20ContractAddress;
	address: EthAddress;
	blockNumber: number;
	getBalanceAtBlock: (params: {
		contract: Erc20ContractAddress;
		address: EthAddress;
		blockTag: number;
	}) => Promise<bigint>;
}): Promise<boolean> => {
	const [balanceBefore, balanceAfter] = await Promise.all([
		getBalanceAtBlock({ contract, address, blockTag: blockNumber - 1 }),
		getBalanceAtBlock({ contract, address, blockTag: blockNumber })
	]);

	return balanceBefore !== balanceAfter;
};
