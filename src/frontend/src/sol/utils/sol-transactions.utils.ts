import type { SolAddress } from '$lib/types/address';
import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';

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

	const from = accountKeys[0];
	const to = accountKeys[1];

	const isSender = from === address;

	const { preBalances, postBalances, fee } = meta ?? {};

	const balanceIdx = isSender ? 0 : 1;

	const amount =
		(postBalances?.[balanceIdx] ?? 0n) -
		(preBalances?.[balanceIdx] ?? 0n) +
		(isSender ? (fee ?? 0n) : 0n);

	const type = isSender ? 'send' : 'receive';

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
