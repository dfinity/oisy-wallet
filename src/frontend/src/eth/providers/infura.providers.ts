import {
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK_ID,
	BSC_TESTNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	ETHEREUM_NETWORK_ID,
	INFURA_NETWORK_BASE,
	INFURA_NETWORK_BASE_SEPOLIA,
	INFURA_NETWORK_BNB_MAINNET,
	INFURA_NETWORK_BNB_TESTNET,
	INFURA_NETWORK_HOMESTEAD,
	INFURA_NETWORK_SEPOLIA,
	SEPOLIA_NETWORK_ID
} from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import {
	InfuraProvider as InfuraProviderLib,
	type FeeData,
	type Networkish,
	type TransactionResponse
} from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraProvider {
	private readonly provider: InfuraProviderLib;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProviderLib(this.network, INFURA_API_KEY);
	}

	balance = (address: EthAddress): Promise<bigint> => this.provider.getBalance(address);

	getFeeData = (): Promise<FeeData> => this.provider.getFeeData();

	sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
		this.provider.broadcastTransaction(signedTransaction);

	getTransactionCount = (address: EthAddress): Promise<number> =>
		this.provider.getTransactionCount(address, 'pending');

	getBlockNumber = (): Promise<number> => this.provider.getBlockNumber();
}

const providersMap: [NetworkId, Networkish][] = [
	[ETHEREUM_NETWORK_ID, INFURA_NETWORK_HOMESTEAD],
	[SEPOLIA_NETWORK_ID, INFURA_NETWORK_SEPOLIA],
	[BASE_NETWORK_ID, INFURA_NETWORK_BASE],
	[BASE_SEPOLIA_NETWORK_ID, INFURA_NETWORK_BASE_SEPOLIA],
	[BSC_MAINNET_NETWORK_ID, INFURA_NETWORK_BNB_MAINNET],
	[BSC_TESTNET_NETWORK_ID, INFURA_NETWORK_BNB_TESTNET]
];

const providers: Record<NetworkId, InfuraProvider> = providersMap.reduce<
	Record<NetworkId, InfuraProvider>
>((acc, [id, name]) => ({ ...acc, [id]: new InfuraProvider(name) }), {});

export const infuraProviders = (networkId: NetworkId): InfuraProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
