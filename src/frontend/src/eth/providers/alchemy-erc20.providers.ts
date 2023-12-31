import { ERC20_ABI } from '$eth/constants/erc20.constants';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20Transaction } from '$eth/types/erc20-transaction';
import type { WebSocketListener } from '$eth/types/listener';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const PROVIDER_URL = import.meta.env.VITE_ALCHEMY_JSON_RPC_URL;

// AlchemyProvider of ether.js does not support Sepolia
const provider = new JsonRpcProvider(`${PROVIDER_URL}/${API_KEY}`);

export const initMinedTransactionsListener = ({
	contract,
	address,
	listener
}: {
	contract: Erc20Token;
	address: ETH_ADDRESS;
	listener: (params: { hash: string; value: BigNumber }) => Promise<void>;
}): WebSocketListener => {
	const erc20Contract = new ethers.Contract(contract.address, ERC20_ABI, provider);

	const filterListener = async (
		_from: string,
		_address: string,
		_value: BigNumber,
		transaction: Erc20Transaction
	) => {
		const { transactionHash: hash, args } = transaction;
		const [_from_, _to_, value] = args;
		await listener({ hash, value });
	};

	const filterToAddress = erc20Contract.filters.Transfer(null, address);
	erc20Contract.on(filterToAddress, filterListener);

	return {
		disconnect: async () => {
			erc20Contract.off(filterToAddress, filterListener);
		}
	};
};
