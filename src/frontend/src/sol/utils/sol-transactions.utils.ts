import type { SolAddress } from '$lib/types/address';
import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';

/**
 * It maps a transaction to a Solana transaction UI object
 */
// TODO: improve this function to decode/parse correctly the transaction instructions. Example https://github.com/solana-fm/explorer-kit/tree/main#-usage
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
	const to = accountKeys.length > 2 ? accountKeys[1] : from;

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
