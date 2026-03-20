import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ZERO } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { isNullish, nonNullish, toNullable } from '@dfinity/utils';

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
				nonce: toNullable(nonNullish(tx.nonce) ? tx.nonce : undefined),
				gas_limit: toNullable(tx.gasLimit ?? undefined),
				gas_price: toNullable(tx.gasPrice ?? undefined),
				gas_used: toNullable(tx.gasUsed ?? undefined),
				data: toNullable(tx.data ?? undefined),
				nft_token_id: toNullable(tx.tokenId ?? undefined)
			}
		}
	};
};

export const mapUserTransactionToTransaction = (stored: UserTransaction): Transaction => {
	if (!('Evm' in stored.network_data)) {
		throw new Error('Expected Evm network data for ETH transaction mapping');
	}

	const evm = stored.network_data.Evm;

	return {
		hash: stored.id,
		blockNumber: Number(stored.block_index),
		timestamp: Number(stored.timestamp),
		from: stored.from,
		to: stored.to.length > 0 ? stored.to[0] : undefined,
		value: stored.value,
		chainId: evm.chain_id.length > 0 ? BigInt(evm.chain_id[0]) : ZERO,
		nonce: evm.nonce.length > 0 ? evm.nonce[0] : 0,
		gasLimit: evm.gas_limit.length > 0 ? evm.gas_limit[0] : ZERO,
		gasPrice: evm.gas_price.length > 0 ? evm.gas_price[0] : undefined,
		gasUsed: evm.gas_used.length > 0 ? evm.gas_used[0] : undefined,
		data: evm.data.length > 0 ? evm.data[0] : '',
		tokenId: evm.nft_token_id.length > 0 ? evm.nft_token_id[0] : undefined
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

const allEthNetworks = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

/**
 * Maps a frontend networkId + optional contract info to a Candid BackendTokenId.
 */
export const buildEvmNativeBackendTokenId = ({
	networkId
}: {
	networkId: NetworkId;
}): BackendTokenId | undefined => {
	const network = allEthNetworks.find(({ id }) => id === networkId);
	if (isNullish(network)) {
		return undefined;
	}
	return { EvmNative: network.chainId };
};

export const buildErcBackendTokenId = ({
	networkId,
	contractAddress,
	standard
}: {
	networkId: NetworkId;
	contractAddress: string;
	standard: TokenStandard;
}): BackendTokenId | undefined => {
	const network = allEthNetworks.find(({ id }) => id === networkId);
	if (isNullish(network)) {
		return undefined;
	}
	const pair: [string, bigint] = [contractAddress, network.chainId];
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
