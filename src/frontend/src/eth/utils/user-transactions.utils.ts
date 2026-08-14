import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { isNetworkEthereum } from '$lib/utils/network.utils';
import { fromNullable, isNullish, nonNullish, toNullable } from '@dfinity/utils';

/**
 * The backend key under which a token's stored transaction history lives.
 *
 * The contract address is lowercased: the backend holds it as a plain string and compares it
 * byte-for-byte as part of the storage key, while our token list carries checksummed addresses and
 * Etherscan returns lowercase ones. Two casings of one contract would be two separate histories.
 *
 * `undefined` for tokens whose history this path cannot store - non-fungible transfers, and anything
 * off an EVM chain.
 */
export const toBackendTokenId = (token: Token): BackendTokenId | undefined => {
	const { network } = token;

	if (!isNetworkEthereum(network)) {
		return;
	}

	const { chainId } = network;

	if (isTokenEthereumNative(token)) {
		return { EvmNative: chainId };
	}

	if (isTokenErc4626(token)) {
		return { Erc4626: [token.address.toLowerCase(), chainId] };
	}

	if (isTokenErc20(token)) {
		return { Erc20: [token.address.toLowerCase(), chainId] };
	}
};

export const mapTransactionToUserTransaction = (transaction: Transaction): UserTransaction => {
	if (isNullish(transaction.hash)) {
		throw new Error('Cannot store a transaction without a hash');
	}

	const {
		hash: id,
		blockNumber,
		timestamp,
		from,
		to,
		value,
		chainId,
		nonce,
		gasLimit,
		gasPrice,
		gasUsed,
		data,
		tokenId
	} = transaction;

	return {
		id,
		block_index: BigInt(blockNumber ?? 0),
		timestamp: BigInt(timestamp ?? 0),
		from,
		to: toNullable(to),
		value,
		network_data: {
			Evm: {
				chain_id: toNullable(nonNullish(chainId) ? BigInt(chainId) : undefined),
				nonce: toNullable(nonNullish(nonce) ? BigInt(nonce) : undefined),
				gas_limit: toNullable(gasLimit),
				gas_price: toNullable(gasPrice),
				gas_used: toNullable(gasUsed),
				data: toNullable(data),
				nft_token_id: toNullable(nonNullish(tokenId) ? BigInt(tokenId) : undefined)
			}
		}
	};
};

export const mapUserTransactionToTransaction = (transaction: UserTransaction): Transaction => {
	if (!('Evm' in transaction.network_data)) {
		throw new Error('Expected Evm network data for ETH transaction mapping');
	}

	const {
		id: hash,
		block_index,
		timestamp,
		from,
		to,
		value,
		network_data: { Evm: evm }
	} = transaction;

	const {
		nonce,
		chain_id: chainId,
		gas_limit: gasLimit,
		gas_price: gasPrice,
		gas_used: gasUsed,
		data,
		nft_token_id: nftTokenId
	} = evm;

	return {
		hash,
		blockNumber: Number(block_index),
		timestamp: Number(timestamp),
		from,
		to: fromNullable(to),
		value,
		chainId: fromNullable(chainId) ?? ZERO,
		nonce: Number(fromNullable(nonce) ?? 0),
		gasLimit: fromNullable(gasLimit) ?? ZERO,
		gasPrice: fromNullable(gasPrice),
		gasUsed: fromNullable(gasUsed),
		data: fromNullable(data) ?? '',
		tokenId: nonNullish(fromNullable(nftTokenId)) ? Number(fromNullable(nftTokenId)) : undefined
	};
};

/**
 * Number of blocks behind the tip at which an ETH transaction is considered finalized.
 * 64 blocks ≈ 2 finality checkpoints on Ethereum PoS.
 */
export const ETH_FINALITY_BLOCKS = 64;

/**
 * Returns true if a transaction is finalized (immutable) based on the current block number.
 * For ETH/EVM: a transaction is finalized when it is at least ETH_FINALITY_BLOCKS behind the tip.
 */
export const isTransactionFinalized = ({
	blockNumber,
	currentBlockNumber
}: {
	blockNumber?: number;
	currentBlockNumber: number;
}): boolean => nonNullish(blockNumber) && currentBlockNumber - blockNumber >= ETH_FINALITY_BLOCKS;
