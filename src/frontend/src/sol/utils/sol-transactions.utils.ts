import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';

/**
 * It maps a transaction to a Solana transaction UI object
 */
export const mapSolTransactionUi = (transaction: SolRpcTransaction): SolTransactionUi => {
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

	const { preBalances, postBalances, fee } = meta ?? {};

	const amount = (preBalances?.[0] ?? 0n) - (postBalances?.[0] ?? 0n) - (fee ?? 0n);

	const type = amount > 0n ? 'send' : 'receive';

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
