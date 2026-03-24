import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import type { TokenStandard } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { fromNullable, nonNullish, toNullable } from '@dfinity/utils';

/**
 * Number of blocks behind the tip at which an ETH transaction is considered finalized.
 * 64 blocks ≈ 2 finality checkpoints on Ethereum PoS.
 */
export const ETH_FINALITY_BLOCKS = 64;

export const mapTransactionToUserTransaction = (tx: Transaction): UserTransaction => {
	if (tx.hash === undefined || tx.hash === null) {
		throw new Error('Cannot store a transaction without a hash');
	}

	return {
		id: tx.hash,
		block_index: BigInt(tx.blockNumber ?? 0),
		timestamp: BigInt(tx.timestamp ?? 0),
		from: tx.from,
		to: toNullable(tx.to ?? undefined),
		value: tx.value ?? ZERO,
		network_data: {
			Evm: {
				chain_id: toNullable(nonNullish(tx.chainId) ? BigInt(tx.chainId) : undefined),
				nonce: toNullable(nonNullish(tx.nonce) ? BigInt(tx.nonce) : undefined),
				gas_limit: toNullable(tx.gasLimit ?? undefined),
				gas_price: toNullable(tx.gasPrice ?? undefined),
				gas_used: toNullable(tx.gasUsed ?? undefined),
				data: toNullable(tx.data ?? undefined),
				nft_token_id: toNullable(nonNullish(tx.tokenId) ? BigInt(tx.tokenId) : undefined)
			}
		}
	};
};

export const mapUserTransactionToTransaction = (stored: UserTransaction): Transaction => {
	if (!('Evm' in stored.network_data)) {
		throw new Error('Expected Evm network data for ETH transaction mapping');
	}

	const evm = stored.network_data.Evm;

	const nonce = fromNullable(evm.nonce);
	const nftTokenId = fromNullable(evm.nft_token_id);

	return {
		hash: stored.id,
		blockNumber: Number(stored.block_index),
		timestamp: Number(stored.timestamp),
		from: stored.from,
		to: fromNullable(stored.to),
		value: stored.value,
		chainId: fromNullable(evm.chain_id) ?? ZERO,
		nonce: nonNullish(nonce) ? Number(nonce) : 0,
		gasLimit: fromNullable(evm.gas_limit) ?? ZERO,
		gasPrice: fromNullable(evm.gas_price),
		gasUsed: fromNullable(evm.gas_used),
		data: fromNullable(evm.data) ?? '',
		tokenId: nonNullish(nftTokenId) ? Number(nftTokenId) : undefined
	};
};

/**
 * Returns true if a transaction is finalized (immutable) based on the current block number.
 * For ETH/EVM: a transaction is finalized when it is at least ETH_FINALITY_BLOCKS behind the tip.
 */
export const isTransactionFinalized = ({
	blockNumber,
	currentBlockNumber
}: {
	blockNumber: number | undefined;
	currentBlockNumber: number;
}): boolean => {
	if (blockNumber === undefined) {
		return false;
	}
	return currentBlockNumber - blockNumber >= ETH_FINALITY_BLOCKS;
};

export const evmNativeTokenId = (chainId: bigint): BackendTokenId => ({
	EvmNative: chainId
});

export const ercTokenId = ({
	contractAddress,
	chainId,
	standard
}: {
	contractAddress: string;
	chainId: bigint;
	standard: TokenStandard;
}): BackendTokenId | undefined => {
	const pair: [string, bigint] = [contractAddress, chainId];
	switch (standard.code) {
		case 'erc20':
			return { Erc20: pair };
		case 'erc721':
			return { Erc721: pair };
		case 'erc1155':
			return { Erc1155: pair };
		case 'erc4626':
			return { Erc4626: pair };
		default:
			return undefined;
	}
};
