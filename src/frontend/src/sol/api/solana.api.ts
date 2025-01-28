import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { OptionSolAddress, SolAddress } from '$lib/types/address';
import { last } from '$lib/utils/array.utils';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolRpcTransaction, SolSignature } from '$sol/types/sol-transaction';
import { getSolBalanceChange } from '$sol/utils/sol-transactions.utils';
import { getSplBalanceChange } from '$sol/utils/spl-transactions.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { address, assertIsAddress, address as solAddress, type Address } from '@solana/addresses';
import { signature, type Signature } from '@solana/keys';
import type { Lamports } from '@solana/rpc-types';
import type { Writeable } from 'zod';

//lamports are like satoshis: https://solana.com/docs/terminology#lamport
export const loadSolLamportsBalance = async ({
	address,
	network
}: {
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<Lamports> => {
	const { getBalance } = solanaHttpRpc(network);
	const wallet = solAddress(address);

	const { value: balance } = await getBalance(wallet).send();

	return balance;
};

/**
 * Fetches the SPL token balance for a wallet.
 */
export const loadSplTokenBalance = async ({
	address,
	network,
	tokenAddress
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	tokenAddress: SolAddress;
}): Promise<bigint> => {
	const { getTokenAccountsByOwner } = solanaHttpRpc(network);
	const wallet = solAddress(address);
	const relevantTokenAddress = solAddress(tokenAddress);

	const response = await getTokenAccountsByOwner(
		wallet,
		{
			mint: relevantTokenAddress
		},
		{ encoding: 'jsonParsed' }
	).send();

	if (response.value.length === 0) {
		return BigInt(0);
	}

	const {
		account: {
			data: {
				parsed: {
					info: { tokenAmount }
				}
			}
		}
	} = response.value[0];

	return BigInt(tokenAmount.amount);
};

/**
 * Fetches transactions without an error for a given wallet address.
 */
export const getSolTransactions = async ({
	address,
	network,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolTransactionsParams): Promise<SolRpcTransaction[]> => {
	const wallet = solAddress(address);
	const beforeSignature = nonNullish(before) ? signature(before) : undefined;
	const signatures = await fetchSignatures({ network, wallet, before: beforeSignature, limit });

	const transactions = await signatures.reduce(
		async (accPromise, signature) => {
			const acc = await accPromise;
			const transactionDetail = await fetchTransactionDetailForSignature({ signature, network });
			if (
				nonNullish(transactionDetail) &&
				getSolBalanceChange({ transaction: transactionDetail, address })
			) {
				acc.push(transactionDetail);
			}
			return acc;
		},
		Promise.resolve([] as SolRpcTransaction[])
	);

	return transactions.slice(0, limit);
};

/**
 * Fetches signatures without an error for a given wallet address.
 */
const fetchSignatures = async ({
	network,
	wallet,
	before,
	limit
}: {
	network: SolanaNetworkType;
	wallet: Address;
	before?: Signature;
	limit: number;
}): Promise<SolSignature[]> => {
	const { getSignaturesForAddress } = solanaHttpRpc(network);

	let accumulatedSignatures: SolSignature[] = [];

	const fetchSignaturesBatch = async (before: Signature | undefined): Promise<SolSignature[]> => {
		const fetchedSignatures = await getSignaturesForAddress(wallet, {
			before,
			limit
		}).send();

		const successfulSignatures = fetchedSignatures.filter(({ err }) => isNullish(err));

		accumulatedSignatures = [...accumulatedSignatures, ...successfulSignatures];

		const hasLoadedEnoughTransactions = accumulatedSignatures.length >= limit;
		const hasNoMoreSignaturesLeft = fetchedSignatures.length < limit;

		if (hasLoadedEnoughTransactions || hasNoMoreSignaturesLeft) {
			return accumulatedSignatures.slice(0, limit);
		}

		const lastSignature = last(fetchedSignatures as Writeable<typeof fetchedSignatures>)?.signature;
		return fetchSignaturesBatch(lastSignature);
	};

	return await fetchSignaturesBatch(before);
};

const fetchTransactionDetailForSignature = async ({
	signature: { signature, confirmationStatus },
	network
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
}): Promise<SolRpcTransaction | null> => {
	const { getTransaction } = solanaHttpRpc(network);

	const rpcTransaction = await getTransaction(signature, {
		maxSupportedTransactionVersion: 0
	}).send();

	if (isNullish(rpcTransaction)) {
		return null;
	}

	return {
		...rpcTransaction,
		version: rpcTransaction.version,
		confirmationStatus,
		id: signature.toString()
	};
};

export const loadTokenAccount = async ({
	address,
	network,
	tokenAddress
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	tokenAddress: SolAddress;
}): Promise<OptionSolAddress> => {
	const { getTokenAccountsByOwner } = solanaHttpRpc(network);
	const wallet = solAddress(address);
	const relevantTokenAddress = solAddress(tokenAddress);

	const response = await getTokenAccountsByOwner(
		wallet,
		{
			mint: relevantTokenAddress
		},
		{ encoding: 'jsonParsed' }
	).send();

	// In case of missing token account, we let the caller handle it.
	if (response.value.length === 0) {
		return undefined;
	}

	const { pubkey: accountAddress } = response.value[0];

	return accountAddress;
};

/**
 * Fetches SPL token transactions for a given wallet address and token mint.
 */
//TODO add unit tests
export const getSplTransactions = async ({
	address,
	network,
	tokenAddress,
	before,
	limit = Number(WALLET_PAGINATION)
}: GetSolTransactionsParams & {
	tokenAddress: SolAddress;
}): Promise<SolRpcTransaction[]> => {
	assertIsAddress(tokenAddress);

	const { getTokenAccountsByOwner } = solanaHttpRpc(network);
	const relevantTokenAddress = solAddress(tokenAddress);
	const wallet = solAddress(address);

	const beforeSignature = nonNullish(before) ? signature(before) : undefined;

	const tokenAccounts = await getTokenAccountsByOwner(
		wallet,
		{
			mint: relevantTokenAddress
		},
		{ encoding: 'jsonParsed' }
	).send();

	const signatures = (
		await Promise.all(
			tokenAccounts.value.map(({ pubkey }) =>
				fetchSignatures({
					network,
					wallet: solAddress(pubkey),
					before: beforeSignature,
					limit
				})
			)
		)
	).flat();

	const transactions = await signatures.reduce(
		async (accPromise, sig) => {
			const acc = await accPromise;
			const transactionDetail = await fetchTransactionDetailForSignature({
				signature: sig,
				network
			});

			if (
				nonNullish(transactionDetail) &&
				//TODO handle self sending
				getSplBalanceChange({
					transaction: transactionDetail,
					tokenAddress,
					address
				}) > 0
			) {
				acc.push(transactionDetail);
			}
			return acc;
		},
		Promise.resolve([] as SolRpcTransaction[])
	);

	return transactions.slice(0, limit);
};

/**
 * Fetches the cost in lamports of creating a new Associated Token Account (ATA).
 *
 * The cost is equivalent to the rent-exempt cost for the size of an ATA.
 * https://solana.com/docs/core/fees#rent-exempt
 */
export const getSolCreateAccountFee = async (network: SolanaNetworkType): Promise<Lamports> => {
	const { getMinimumBalanceForRentExemption } = solanaHttpRpc(network);
	return await getMinimumBalanceForRentExemption(ATA_SIZE).send();
};

/**
 * Calculates the maximum among the most recent prioritization fees in microlamports.
 *
 * It is useful to have an estimate of how much a transaction could cost to be processed without expiring.
 */
export const estimatePriorityFee = async ({
	network,
	addresses
}: {
	network: SolanaNetworkType;
	addresses?: SolAddress[];
}): Promise<bigint> => {
	const { getRecentPrioritizationFees } = solanaHttpRpc(network);
	const fees = await getRecentPrioritizationFees(
		nonNullish(addresses) ? addresses.map(address) : undefined
	).send();

	return fees.reduce<bigint>(
		(max, { prioritizationFee: current }) => (BigInt(current) > max ? BigInt(current) : max),
		0n
	);
};
