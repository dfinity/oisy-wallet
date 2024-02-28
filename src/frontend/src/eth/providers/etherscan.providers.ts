import type { ETH_ADDRESS } from '$lib/types/address';
import type { BlockTag } from '@ethersproject/abstract-provider';
import { EtherscanProvider, type TransactionResponse } from '@ethersproject/providers';

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
const NETWORK = import.meta.env.VITE_ETHERSCAN_NETWORK;

const provider = new EtherscanProvider(NETWORK, API_KEY);

export const transactions = ({
	address,
	startBlock,
	endBlock
}: {
	address: ETH_ADDRESS;
	startBlock?: BlockTag;
	endBlock?: BlockTag;
}): Promise<TransactionResponse[]> => provider.getHistory(address, startBlock, endBlock);
