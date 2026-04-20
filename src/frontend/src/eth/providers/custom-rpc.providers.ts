import type { EthAddress } from '$eth/types/address';
import type { CustomEvmNetwork } from '$eth/types/custom-network';
import type { GetFeeData } from '$eth/types/infura';
import { TRACK_ETH_ESTIMATE_GAS_ERROR } from '$lib/constants/analytics.constants';
import { trackEvent } from '$lib/services/analytics.services';
import { JsonRpcProvider, Network, type FeeData, type TransactionResponse } from 'ethers/providers';

/**
 * Provider for user-added EVM chains.
 *
 * Mirrors the method surface of `InfuraProvider` so call sites can operate
 * on either variant, but is backed by a plain JSON-RPC endpoint — no
 * Infura/Alchemy integration. `staticNetwork` is set from the user-supplied
 * `chainId`, which is validated separately at add time (see
 * `verifyChainId`); this prevents ethers from issuing an `eth_chainId`
 * probe on every request.
 */
export class CustomRpcProvider {
	private readonly provider: JsonRpcProvider;
	private readonly networkName: string;

	constructor({ rpcUrl, chainId, name }: { rpcUrl: string; chainId: bigint; name: string }) {
		const network = new Network(name, chainId);
		this.provider = new JsonRpcProvider(rpcUrl, network, { staticNetwork: network });
		this.networkName = name;
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
					network: this.networkName
				},
				warning: `Error estimating gas for custom network ${this.networkName}: ${err}`
			});

			return undefined;
		}
	};

	sendTransaction = (signedTransaction: string): Promise<TransactionResponse> =>
		this.provider.broadcastTransaction(signedTransaction);

	getTransactionCount = ({
		address,
		tag
	}: {
		address: EthAddress;
		tag: 'pending' | 'latest';
	}): Promise<number> => this.provider.getTransactionCount(address, tag);

	getBlockNumber = (): Promise<number> => this.provider.getBlockNumber();

	destroy = (): void => {
		this.provider.destroy();
	};
}

const cache = new Map<string, CustomRpcProvider>();

const cacheKey = ({ chainId, rpcUrl }: { chainId: bigint; rpcUrl: string }): string =>
	`${chainId}:${rpcUrl}`;

/**
 * Returns a cached `CustomRpcProvider` for the given custom network, or
 * constructs a new one if the cache does not yet contain an entry for the
 * `(chainId, rpcUrl)` pair. Editing either field in the store produces a
 * cache miss on the next call, so stale providers never serve traffic.
 */
export const customRpcProviders = (network: CustomEvmNetwork): CustomRpcProvider => {
	const key = cacheKey({ chainId: network.chainId, rpcUrl: network.rpcUrl });
	const cached = cache.get(key);
	if (cached !== undefined) {
		return cached;
	}
	const provider = new CustomRpcProvider({
		rpcUrl: network.rpcUrl,
		chainId: network.chainId,
		name: network.name
	});
	cache.set(key, provider);
	return provider;
};

/** Test-only: clear the module-level provider cache. */
export const __resetCustomRpcProvidersCache = (): void => {
	cache.clear();
};
