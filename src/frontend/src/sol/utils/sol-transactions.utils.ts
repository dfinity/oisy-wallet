import type { SolAddress } from '$lib/types/address';
import { SYSTEM_ACCOUNT_KEYS } from '$sol/constants/sol.constants';
import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import { address as solAddress } from '@solana/addresses';

interface TransactionWithAddress {
	transaction: SolRpcTransaction;
	address: SolAddress;
}

export const getSolBalanceChange = ({ transaction, address }: TransactionWithAddress) => {
	const {
		transaction: {
			message: { accountKeys }
		},
		meta
	} = transaction;

	const accountIndex = accountKeys.indexOf(solAddress(address));
	const { preBalances, postBalances } = meta ?? {};

	return (postBalances?.[accountIndex] ?? 0n) - (preBalances?.[accountIndex] ?? 0n);
};

/**
 * It maps a transaction to a Solana transaction UI object
 */
// TODO: improve this function to decode/parse correctly the transaction instructions. Example https://github.com/solana-fm/explorer-kit/tree/main#-usage
export const mapSolTransactionUi = ({
	transaction,
	address
}: TransactionWithAddress): SolTransactionUi => {
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

	const isSender = from === address;

	const accountIndex = accountKeys.indexOf(solAddress(address));

	const { preBalances, postBalances, fee } = meta ?? {};

	const relevantFee = isSender ? (fee ?? 0n) : 0n;

	const amount = getSolBalanceChange({ transaction, address }) + relevantFee;

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
