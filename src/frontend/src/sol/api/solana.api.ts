import type { OptionSolAddress, SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { last } from '$lib/utils/array.utils';
import { getAccountInfo } from '$sol/api/sol-rpc.api';
import { ATA_SIZE } from '$sol/constants/ata.constants';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import type { SolanaNetworkType } from '$sol/types/network';
import type {
	SolRpcTransaction,
	SolRpcTransactionRaw,
	SolSignature
} from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';
import { address as solAddress, type Address, type Lamports, type Signature } from '@solana/kit';
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

export const loadTokenBalance = async ({
	ataAddress,
	network
}: {
	ataAddress: SolAddress;
	network: SolanaNetworkType;
}): Promise<bigint | undefined> => {
	const { getTokenAccountBalance } = solanaHttpRpc(network);
	const wallet = solAddress(ataAddress);

	const {
		value: { amount }
	} = await getTokenAccountBalance(wallet).send();

	if (nonNullish(amount)) {
		return BigInt(amount);
	}
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

export const getRpcTransaction = async ({
	signature: { signature },
	network
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
}) => {
	const { getTransaction } = solanaHttpRpc(network);

	return await getTransaction(signature, {
		maxSupportedTransactionVersion: 0,
		encoding: 'jsonParsed'
	}).send();
};

export const fetchTransactionDetailForSignature = async ({
	signature,
	network
}: {
	signature: SolSignature;
	network: SolanaNetworkType;
}): Promise<SolRpcTransaction | null> => {
	const { confirmationStatus } = signature;

	const rpcTransaction: SolRpcTransactionRaw | null = await getRpcTransaction({
		signature,
		network
	});

	if (isNullish(rpcTransaction)) {
		return null;
	}

	return {
		...rpcTransaction,
		version: rpcTransaction.version,
		confirmationStatus,
		id: signature.toString(),
		signature: signature.signature
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

	const [{ pubkey: accountAddress }] = response.value;

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
		nonNullish(addresses) ? addresses.map(solAddress) : undefined
	).send();

	return fees.reduce<bigint>(
		(max, { prioritizationFee: current }) => (BigInt(current) > max ? BigInt(current) : max),
		0n
	);
};

export const getTokenDecimals = async ({
	identity,
	address,
	network
}: {
	identity: OptionIdentity;
	address: SplTokenAddress;
	network: SolanaNetworkType;
}): Promise<number> => {
	const result = await getAccountInfo({ identity, address, network });

	if (nonNullish(result)) {
		const {
			data: {
				json: {
					parsed: { info }
				}
			}
		} = result;

		return nonNullish(info) && 'decimals' in info ? (info.decimals as number) : 0;
	}

	return 0;
};

export const getTokenOwner = async ({
	identity,
	address,
	network
}: {
	identity: OptionIdentity;
	address: SplTokenAddress;
	network: SolanaNetworkType;
}): Promise<SplTokenAddress | undefined> => {
	const result = await getAccountInfo({ identity, address, network });

	return result?.owner.toString();
};

export const getAccountOwner = async ({
	identity,
	address,
	network
}: {
	identity: OptionIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<SolAddress | undefined> => {
	const result = await getAccountInfo({ identity, address, network });

	if (isNullish(result)) {
		return undefined;
	}

	// We need to cast the type since it is not implied
	const { owner } = result.data.json.parsed.info as { owner: SolAddress };

	return owner;
};

export const checkIfAccountExists = async ({
	identity,
	address,
	network
}: {
	identity: OptionIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<boolean> => {
	const result = await getAccountInfo({ identity, address, network });

	return nonNullish(result);
};
