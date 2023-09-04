import { ERC20_ABI } from '$lib/constants/erc20.constants';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { Erc20Token } from '$lib/types/erc20';
import type { WebSocketListener } from '$lib/types/listener';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const PROVIDER_URL = import.meta.env.VITE_ALCHEMY_JSON_RPC_URL;

// AlchemyProvider of ether.js does not support Sepolia
const provider = new JsonRpcProvider(`${PROVIDER_URL}/${API_KEY}`);

export const initPendingTransactionsListener = ({
	contract,
	address,
	listener
}: {
	contract: Erc20Token;
	address: ECDSA_PUBLIC_KEY;
	listener: (hash: string) => Promise<void>;
}): WebSocketListener => {
	const erc20Contract = new ethers.Contract(contract.address, ERC20_ABI, provider);

	const filterFromAddress = erc20Contract.filters.Transfer(address, null);
	erc20Contract.on(filterFromAddress, listener);

	const filterToAddress = erc20Contract.filters.Transfer(null, address);
	erc20Contract.on(filterToAddress, listener);

	return {
		disconnect: async () => {
			erc20Contract.off(filterFromAddress, listener);
			erc20Contract.off(filterToAddress, listener);
		}
	};
};
