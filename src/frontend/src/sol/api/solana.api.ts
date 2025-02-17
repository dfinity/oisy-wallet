import type { OptionSolAddress, SolAddress } from '$lib/types/address';
import { last } from '$lib/utils/array.utils';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolSignature } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';
import { address, address as solAddress, type Address } from '@solana/addresses';
import { type Signature } from '@solana/keys';
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
 * Fetches signatures without an error for a given wallet address.
 */
export const fetchSignatures = async ({
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

export const fetchTransactionDetailForSignature = async ({
	signature: { signature, confirmationStatus },
	network
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
}) => {
	const { getTransaction } = solanaHttpRpc(network);

	const rpcTransaction = await getTransaction(signature, {
		maxSupportedTransactionVersion: 0,
		encoding: 'jsonParsed'
	}).send();

	if (isNullish(rpcTransaction)) {
		return null;
	}

	return {
		...rpcTransaction,
		version: rpcTransaction.version,
		confirmationStatus,
		id: signature.toString(),
		signature
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

export const getTokenDecimals = async ({
	address,
	network
}: {
	address: SplTokenAddress;
	network: SolanaNetworkType;
}): Promise<number> => {
	const { getAccountInfo } = solanaHttpRpc(network);
	const token = solAddress(address);

	const { value } = await getAccountInfo(token, { encoding: 'jsonParsed' }).send();

	if (nonNullish(value) && 'parsed' in value.data) {
		const {
			data: {
				parsed: { info }
			}
		} = value;

		return nonNullish(info) && 'decimals' in info ? (info.decimals as number) : 0;
	}

	return 0;
};

export const getTokenOwner = async ({
	address,
	network
}: {
	address: SplTokenAddress;
	network: SolanaNetworkType;
}): Promise<SplTokenAddress | undefined> => {
	const { getAccountInfo } = solanaHttpRpc(network);
	const token = solAddress(address);

	const { value } = await getAccountInfo(token, { encoding: 'jsonParsed' }).send();

	return value?.owner?.toString();
};
