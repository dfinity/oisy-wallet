import { ERC20_ABI } from '$eth/constants/erc20.constants';
import {
	ALCHEMY_JSON_RPC_URL_MAINNET,
	ALCHEMY_JSON_RPC_URL_SEPOLIA
} from '$eth/constants/networks.constants';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20Transaction } from '$eth/types/erc20-transaction';
import type { WebSocketListener } from '$eth/types/listener';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$icp-eth/constants/networks.constants';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { assertNonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

const API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

export class AlchemyErc20Provider {
	private readonly provider: JsonRpcProvider;

	// AlchemyProvider of ether.js does not support Sepolia
	constructor(private readonly providerUrl: string) {
		this.provider = new JsonRpcProvider(`${this.providerUrl}/${API_KEY}`);
	}

	initMinedTransactionsListener({
		contract,
		address,
		listener
	}: {
		contract: Erc20Token;
		address: ETH_ADDRESS;
		listener: (params: { hash: string; value: BigNumber }) => Promise<void>;
	}): WebSocketListener {
		const erc20Contract = new ethers.Contract(contract.address, ERC20_ABI, this.provider);

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
	}
}

const providers: Record<NetworkId, AlchemyErc20Provider> = {
	[ETHEREUM_NETWORK_ID]: new AlchemyErc20Provider(ALCHEMY_JSON_RPC_URL_MAINNET),
	[SEPOLIA_NETWORK_ID]: new AlchemyErc20Provider(ALCHEMY_JSON_RPC_URL_SEPOLIA)
};

export const alchemyErc20Providers = (networkId: NetworkId): AlchemyErc20Provider => {
	const provider = providers[networkId];

	assertNonNullish(provider, `No Alchemy ERC20 provider for network ${networkId.toString()}`);

	return provider;
};
