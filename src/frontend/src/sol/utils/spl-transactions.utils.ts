import type { SolAddress } from '$lib/types/address';
import { SYSTEM_ACCOUNT_KEYS } from '$sol/constants/sol.constants';
import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';

interface SplInfo {
	transaction: SolRpcTransaction;
	address: SolAddress;
	tokenAddress: SolAddress;
}

//TODO add unit tests
export const getSplBalanceChange = ({ transaction, address, tokenAddress }: SplInfo) => {
	const { meta } = transaction;
	const { preTokenBalances, postTokenBalances } = meta ?? {};
	const filterRelevantTokenBalance = (balance: { mint: string; owner?: SolAddress }) =>
		balance.mint === tokenAddress && balance.owner === address;

	const relevantPreTokenBalances = preTokenBalances?.filter(filterRelevantTokenBalance);
	const relevantPostTokenBalances = postTokenBalances?.filter(filterRelevantTokenBalance);

	const preTokenBalance = relevantPreTokenBalances?.reduce(
		(acc, curr) => acc + BigInt(curr.uiTokenAmount.amount),
		0n
	);

	const postTokenBalance = relevantPostTokenBalances?.reduce(
		(acc, curr) => acc + BigInt(curr.uiTokenAmount.amount),
		0n
	);

	return (postTokenBalance ?? 0n) - (preTokenBalance ?? 0n);
};

/**
 * It maps a transaction to a Solana transaction UI object
 */
//TODO add unit tests
export const mapSplTransactionUi = ({
	transaction,
	address,
	tokenAddress
}: SplInfo): SolTransactionUi => {
	const {
		id,
		signature,
		blockTime,
		confirmationStatus: status,
		transaction: {
			message: { accountKeys }
		},
		meta
	} = transaction;

	const nonSystemAccountKeys = accountKeys.filter(
		({ pubkey }) => !SYSTEM_ACCOUNT_KEYS.includes(pubkey)
	);

	const from = accountKeys[0];
	//edge-case: transaction from my wallet, to my wallet
	const to = nonSystemAccountKeys.length === 1 ? nonSystemAccountKeys[0] : accountKeys[1];

	const { fee } = meta ?? {};
	const relevantFee = from.pubkey === address ? (fee ?? 0n) : 0n;

	const amount = getSplBalanceChange({ transaction, address, tokenAddress }) + relevantFee;

	const type = amount > 0n ? 'receive' : 'send';

	return {
		id,
		signature,
		timestamp: blockTime ?? 0n,
		from: from.pubkey,
		to: to?.pubkey,
		type,
		status,
		value: amount < 0n ? -amount : amount,
		fee
	};
};
