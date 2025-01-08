import type { SolAddress } from '$lib/types/address';
import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import { address as solAddress } from '@solana/addresses';

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

	const accountIndex = accountKeys.indexOf(solAddress(address));

	const { preBalances, postBalances, fee } = meta ?? {};

	const relevantFee = isSender ? (fee ?? 0n) : 0n;

	const amount =
		(postBalances?.[accountIndex] ?? 0n) - (preBalances?.[accountIndex] ?? 0n) + relevantFee;

	const type = isSender ? 'receive' : 'send';

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
