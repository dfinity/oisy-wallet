import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ethersProvider } from '$eth/providers/ethers.providers';
import type { EthAddress } from '$eth/types/address';
import type { GetFeeData } from '$eth/types/infura';
import type { EthersProviderNetwork } from '$eth/types/network';
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
import type {
	FeeData,
	JsonRpcProvider,
	TransactionReceipt,
	TransactionResponse
} from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraProvider {
	private readonly provider: JsonRpcProvider;

	constructor(private readonly network: EthersProviderNetwork) {
		this.provider = ethersProvider(this.network);
	}

	// What this provider has always reported to analytics: the Infura name, back when it held
	// nothing but a `Networkish`. Kept verbatim so tracked values stay comparable across the
	// switch to the whole network object.
	private get networkLabel(): string {
		return (this.network.providers.infura ?? this.network.name).toString();
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
					network: this.networkLabel
				},
				warning: `Error estimating gas for network ${this.networkLabel}: ${err}`
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
	(acc, network) => ({ ...acc, [network.id]: new InfuraProvider(network) }),
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
