import type { ETH_ADDRESS } from '$lib/types/address';
import { EtherscanProvider, type TransactionResponse } from '@ethersproject/providers';

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
const NETWORK = import.meta.env.VITE_ETHERSCAN_NETWORK;

const provider = new EtherscanProvider(NETWORK, API_KEY);

export const transactions = (address: ETH_ADDRESS): Promise<TransactionResponse[]> =>
	provider.getHistory(address);
