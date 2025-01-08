import type { SolAddress } from '$lib/types/address';
import { SYSTEM_ACCOUNT_KEYS } from '$sol/constants/sol.constants';
import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import { address as solAddress } from '@solana/addresses';

/**
 * It maps a transaction to a Solana transaction UI object
 */
export const mapSolTransactionUi = ({
	transaction,
	address
}: {
	transaction: SolRpcTransaction;
	address: SolAddress;
}): SolTransactionUi => {
	const {
		id,
		blockTime,
		confirmationStatus: status,
		transaction: {
			message: { accountKeys }
		},
		meta
	} = transaction;

	const nonSystemAccountKeys = accountKeys.filter((key) => !SYSTEM_ACCOUNT_KEYS.includes(key));

	const from = accountKeys[0];
	//edge-case: transaction from my wallet, to my wallet
	const to = nonSystemAccountKeys.length === 1 ? nonSystemAccountKeys[0] : accountKeys[1];

	const accountIndex = accountKeys.indexOf(solAddress(address));

	const { preBalances, postBalances, fee } = meta ?? {};

	const relevantFee = from === address ? (fee ?? 0n) : 0n;

	const amount =
		(postBalances?.[accountIndex] ?? 0n) - (preBalances?.[accountIndex] ?? 0n) + relevantFee;

	const type = amount > 0n ? 'receive' : 'send';

	return {
		id,
		timestamp: blockTime ?? 0n,
		from,
		to,
		type,
		status,
		value: amount,
		fee
	};
};
