import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { nonNullish, toNullable } from '@dfinity/utils';

export const mapSolTransactionToUserTransaction = (tx: SolTransactionUi): UserTransaction => ({
	id: tx.id,
	block_index: BigInt(tx.blockNumber ?? ZERO),
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
