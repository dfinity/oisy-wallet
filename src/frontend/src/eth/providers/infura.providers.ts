import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import type { GetFeeData } from '$eth/services/fee.services';
import type { EthereumNetwork } from '$eth/types/network';
import { TRACK_ETH_ESTIMATE_GAS_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
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
	private readonly tmpnetwork: Networkish;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProviderLib(network, INFURA_API_KEY);
		this.tmpnetwork = this.network;
	}

	balance = (address: EthAddress): Promise<bigint> => this.provider.getBalance(address);

	getFeeData = (): Promise<FeeData> => {
		console.log('getFeeData: ', (this.tmpnetwork as unknown as EthereumNetwork).chainId);
		return this.provider.getFeeData();
	};

	estimateGas = (params: GetFeeData): Promise<bigint> => this.provider.estimateGas(params);

	safeEstimateGas = async (params: GetFeeData): Promise<bigint | undefined> => {
		console.log('safeEstimateGas: ', (this.tmpnetwork as unknown as EthereumNetwork).chainId);
		try {
			return await this.estimateGas(params);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_ETH_ESTIMATE_GAS_ERROR,
				metadata: {
					error: `${err}`,
					network: this.network.toString()
				},
				warning: `Error estimating gas for network ${this.network}: ${err}`
			});

			return undefined;
		}
	};

	sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
		this.provider.broadcastTransaction(signedTransaction);

	getTransactionCount = (address: EthAddress): Promise<number> =>
		this.provider.getTransactionCount(address, 'pending');

	getBlockNumber = (): Promise<number> => this.provider.getBlockNumber();
}

const providers: Record<NetworkId, InfuraProvider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, InfuraProvider>>(
	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraProvider(infura) }),
	{}
);

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
