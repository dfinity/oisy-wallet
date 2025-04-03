import {
	ALCHEMY_JSON_RPC_URL_MAINNET,
	ALCHEMY_JSON_RPC_URL_SEPOLIA,
	ETHEREUM_NETWORK_ID,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20Transaction } from '$eth/types/erc20-transaction';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { get } from 'svelte/store';

export class AlchemyErc20Provider {
	private readonly provider: JsonRpcProvider;

	// AlchemyProvider of ether.js does not support Sepolia
	constructor(private readonly providerUrl: string) {
		this.provider = new JsonRpcProvider(`${this.providerUrl}/${ALCHEMY_API_KEY}`);
	}

	initMinedTransactionsListener = ({
		contract,
		address,
		listener
	}: {
		contract: Erc20Token;
		address: EthAddress;
		listener: (params: { hash: string; value: bigint }) => Promise<void>;
	}): WebSocketListener => {
		const erc20Contract = new ethers.Contract(contract.address, ERC20_ABI, this.provider);

		// eslint-disable-next-line local-rules/prefer-object-params -- This function needs to have listed arguments to match the Listener type passed to ethers.js providers
		const filterListener = async (
			_from: string,
			_address: string,
			_value: BigNumber,
			transaction: Erc20Transaction
		) => {
			const { transactionHash: hash, args } = transaction;
			const [_from_, _to_, value] = args;
			await listener({ hash, value: value?.toBigInt() });
		};

		const filterToAddress = erc20Contract.filters.Transfer(null, address);
		erc20Contract.on(filterToAddress, filterListener);

		return {
			// eslint-disable-next-line require-await
			disconnect: async () => {
				erc20Contract.off(filterToAddress, filterListener);
			}
		};
	};
}

const providers: Record<NetworkId, AlchemyErc20Provider> = {
	[ETHEREUM_NETWORK_ID]: new AlchemyErc20Provider(ALCHEMY_JSON_RPC_URL_MAINNET),
	[SEPOLIA_NETWORK_ID]: new AlchemyErc20Provider(ALCHEMY_JSON_RPC_URL_SEPOLIA)
};

export const alchemyErc20Providers = (networkId: NetworkId): AlchemyErc20Provider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_alchemy_erc20_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
