import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { fromNullable, nonNullish, toNullable } from '@dfinity/utils';
import { signature as solSignature } from '@solana/kit';

export const mapSolTransactionToUserTransaction = (tx: SolTransactionUi): UserTransaction => ({
	id: tx.id,
	block_index: BigInt(tx.blockNumber ?? 0),
	timestamp: BigInt(tx.timestamp ?? ZERO),
	from: tx.from,
	to: toNullable(tx.to),
	value: tx.value ?? ZERO,
	network_data: {
		Sol: {
			fee: toNullable(tx.fee),
			from_owner: toNullable(tx.fromOwner),
			to_owner: toNullable(tx.toOwner)
		}
	}
});

/**
 * Maps a backend `UserTransaction` (with Sol network data) back to a `SolTransactionUi`.
 * Requires the user's wallet address to determine the transaction direction (send/receive).
 */
export const mapUserTransactionToSolTransaction = ({
	transaction,
	address
}: {
	transaction: UserTransaction;
	address: SolAddress;
}): SolTransactionUi => {
	if (!('Sol' in transaction.network_data)) {
		throw new Error('Expected Sol network data for Solana transaction mapping');
	}

	const {
		id,
		block_index,
		timestamp,
		from,
		to: toOpt,
		value,
		network_data: { Sol: sol }
	} = transaction;

	const to = fromNullable(toOpt);
	const fee = fromNullable(sol.fee);
	const fromOwner = fromNullable(sol.from_owner);
	const toOwner = fromNullable(sol.to_owner);

	const [sig] = id.split('-');

	const isSend = address === from || address === fromOwner;

	return {
		id,
		signature: solSignature(sig),
		blockNumber: Number(block_index),
		timestamp: BigInt(timestamp),
		from,
		to,
		value,
		type: isSend ? 'send' : 'receive',
		status: 'finalized',
		...(nonNullish(fee) && { fee }),
		...(nonNullish(fromOwner) && { fromOwner }),
		...(nonNullish(toOwner) && { toOwner })
	};
};

/**
 * A Solana transaction is finalized when its commitment status is `'finalized'`.
 */
export const isSolTransactionFinalized = (tx: SolTransactionUi): boolean =>
	tx.status === 'finalized';

/**
 * Derives the backend `TokenId` from the Solana network type and optional SPL token address.
 */
export const solBackendTokenId = ({
	network,
	tokenAddress
}: {
	network: SolanaNetworkType;
	tokenAddress?: SplTokenAddress;
}): BackendTokenId => {
	if (nonNullish(tokenAddress)) {
		return network === 'mainnet' ? { SplMainnet: tokenAddress } : { SplDevnet: tokenAddress };
	}

	return network === 'mainnet' ? { SolNativeMainnet: null } : { SolNativeDevnet: null };
};
