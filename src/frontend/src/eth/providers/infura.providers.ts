import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import type { EthAddress } from '$eth/types/address';
import type { GetFeeData } from '$eth/types/infura';
import {
	OP_STACK_GAS_PRICE_ORACLE_ABI,
	OP_STACK_GAS_PRICE_ORACLE_ADDRESS
} from '$evm/base/constants/base.constants';
import { TRACK_ETH_ESTIMATE_GAS_ERROR } from '$lib/constants/analytics.constants';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import {
	InfuraProvider as InfuraProviderLib,
	type FeeData,
	type Networkish,
	type TransactionReceipt,
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

	estimateGas = (params: GetFeeData): Promise<bigint> => this.provider.estimateGas(params);

	safeEstimateGas = async (params: GetFeeData): Promise<bigint | undefined> => {
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

	// The `GasPriceOracle` predeploy exists only on OP-stack chains, so this reverts anywhere else.
	// `getEthFeeDataWithProvider` gates the call on the chain id.
	getL1FeeUpperBound = (unsignedTxSize: bigint): Promise<bigint> => {
		const gasPriceOracle = new Contract(
			OP_STACK_GAS_PRICE_ORACLE_ADDRESS,
			OP_STACK_GAS_PRICE_ORACLE_ABI,
			this.provider
		);

		return gasPriceOracle.getL1FeeUpperBound(unsignedTxSize);
	};

	sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
		this.provider.broadcastTransaction(signedTransaction);

	// `null` while the transaction is unknown to the node or still unmined; the
	// receipt's `status` is what distinguishes a successful tx from a reverted one.
	getTransactionReceipt = (hash: string): Promise<TransactionReceipt | null> =>
		this.provider.getTransactionReceipt(hash);

	getTransactionCount = ({
		address,
		tag
	}: {
		address: EthAddress;
		tag: 'pending' | 'latest';
	}): Promise<number> => this.provider.getTransactionCount(address, tag);

	getTransactionCountLatest = (address: EthAddress): Promise<number> =>
		this.getTransactionCount({ address, tag: 'latest' });

	getTransactionCountPending = (address: EthAddress): Promise<number> =>
		this.getTransactionCount({ address, tag: 'pending' });

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
