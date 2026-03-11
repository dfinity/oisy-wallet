import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import type { StoredTransaction, TransactionTokenId } from '$declarations/backend/backend.did';
import type { Erc1155ContractAddress } from '$eth/types/erc1155';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { Erc4626ContractAddress } from '$eth/types/erc4626';
import type { Erc721ContractAddress } from '$eth/types/erc721';
import type { NetworkId } from '$lib/types/network';
import type { TokenStandard } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { isNullish, toNullable } from '@dfinity/utils';

/**
 * Number of blocks behind the tip at which an ETH transaction is considered finalized.
 * 64 blocks ≈ 2 finality checkpoints on Ethereum PoS.
 */
export const ETH_FINALITY_BLOCKS = 64;

export const mapTransactionToStored = (tx: Transaction): StoredTransaction => ({
	hash: tx.hash ?? '',
	block_number: BigInt(tx.blockNumber ?? 0),
	timestamp: BigInt(tx.timestamp ?? 0),
	from: tx.from,
	to: toNullable(tx.to ?? undefined),
	nonce: toNullable(tx.nonce !== undefined ? tx.nonce : undefined),
	value: tx.value ?? 0n,
	chain_id: toNullable(tx.chainId !== undefined ? BigInt(tx.chainId) : undefined),
	gas_limit: toNullable(tx.gasLimit ?? undefined),
	gas_price: toNullable(tx.gasPrice ?? undefined),
	gas_used: toNullable(tx.gasUsed ?? undefined),
	data: toNullable(tx.data ?? undefined),
	token_id: toNullable(tx.tokenId ?? undefined)
});

export const mapStoredToTransaction = (stored: StoredTransaction): Transaction => ({
	hash: stored.hash,
	blockNumber: Number(stored.block_number),
	timestamp: Number(stored.timestamp),
	from: stored.from,
	to: stored.to.length > 0 ? stored.to[0] : undefined,
	nonce: stored.nonce.length > 0 ? stored.nonce[0] : undefined,
	value: stored.value,
	chainId: stored.chain_id.length > 0 ? Number(stored.chain_id[0]) : undefined,
	gasLimit: stored.gas_limit.length > 0 ? stored.gas_limit[0] : undefined,
	gasPrice: stored.gas_price.length > 0 ? stored.gas_price[0] : undefined,
	gasUsed: stored.gas_used.length > 0 ? stored.gas_used[0] : undefined,
	data: stored.data.length > 0 ? stored.data[0] : undefined,
	tokenId: stored.token_id.length > 0 ? stored.token_id[0] : undefined
});

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
 * Maps a frontend networkId + optional contract info to a Candid TransactionTokenId.
 */
export const buildEvmNativeTransactionTokenId = ({
	networkId
}: {
	networkId: NetworkId;
}): TransactionTokenId | undefined => {
	const network = allEthNetworks.find(({ id }) => id === networkId);
	if (isNullish(network)) {
		return undefined;
	}
	return { EvmNative: network.chainId };
};

export const buildErcTransactionTokenId = ({
	networkId,
	contractAddress,
	standard
}: {
	networkId: NetworkId;
	contractAddress: string;
	standard: TokenStandard;
}): TransactionTokenId | undefined => {
	const network = allEthNetworks.find(({ id }) => id === networkId);
	if (isNullish(network)) {
		return undefined;
	}
	const pair: [string, bigint] = [contractAddress, network.chainId];
	switch (standard) {
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
