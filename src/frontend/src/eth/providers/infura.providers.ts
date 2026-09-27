import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ALCHEMY_EVM_FALLBACK_ENABLED } from '$env/rest/alchemy.env';
import {
	INFURA_READ_TIMEOUT_MILLISECONDS,
	INFURA_SUBMISSION_TIMEOUT_MILLISECONDS
} from '$eth/constants/eth.constants';
import { ethersFallbackProvider, ethersProvider } from '$eth/providers/ethers.providers';
import type { EthAddress } from '$eth/types/address';
import type { GetFeeData } from '$eth/types/infura';
import type { EthersProviderNetwork } from '$eth/types/network';
import { EthSubmissionUnconfirmedError } from '$eth/types/send';
import { isEthereumNodeRefusal } from '$eth/utils/eth-error.utils';
import {
	OP_STACK_GAS_PRICE_ORACLE_ABI,
	OP_STACK_GAS_PRICE_ORACLE_ADDRESS
} from '$evm/base/constants/base.constants';
import { TRACK_ETH_ESTIMATE_GAS_ERROR } from '$lib/constants/analytics.constants';
import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackProviderFallback } from '$lib/services/provider-fallback-analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { TimeoutError } from '$lib/types/errors';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { withTimeout } from '$lib/utils/timeout.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { keccak256 } from 'ethers/crypto';
import type {
	FeeData,
	JsonRpcProvider,
	TransactionReceipt,
	TransactionResponse
} from 'ethers/providers';
import { get } from 'svelte/store';

// What a call that both providers failed leaves to decide it by.
interface FallbackFailure {
	infuraErr: unknown;
	fallbackErr: unknown;
	fallbackProvider: JsonRpcProvider;
}

export class InfuraProvider {
	private readonly provider: JsonRpcProvider;
	// Asked only after `provider` fails a call a send depends on. `undefined` where there is no
	// second provider to ask — see `ethersFallbackProvider`.
	private readonly fallbackProvider: JsonRpcProvider | undefined;

	constructor(private readonly network: EthersProviderNetwork) {
		this.provider = ethersProvider(this.network);
		this.fallbackProvider = ethersFallbackProvider(this.network);
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

	// The rule every call a send depends on follows: Infura first, and when it fails the call or gives
	// no answer within `milliseconds`, the same call to the fallback. Only for calls that are safe to
	// repeat, since the one Infura was given carries on. `recover` decides what the fallback failing
	// as well amounts to; without it, Infura's error stands.
	private callWithFallback = async <T>({
		operation,
		milliseconds,
		call,
		recover
	}: {
		operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS;
		milliseconds: number;
		call: (provider: JsonRpcProvider) => Promise<T>;
		recover?: (params: FallbackFailure) => Promise<T>;
	}): Promise<T> => {
		const { fallbackProvider } = this;

		if (isNullish(fallbackProvider) || !ALCHEMY_EVM_FALLBACK_ENABLED) {
			return await call(this.provider);
		}

		try {
			return await withTimeout({ promise: call(this.provider), milliseconds });
		} catch (infuraErr: unknown) {
			const track = (resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES) =>
				trackProviderFallback({
					operation,
					trigger: infuraErr instanceof TimeoutError ? 'timeout' : 'error',
					network: this.networkLabel,
					resultStatus
				});

			try {
				const result = await this.askFallback({
					call,
					recover,
					milliseconds,
					fallbackProvider,
					infuraErr
				});

				track(PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS);

				return result;
			} catch (err: unknown) {
				track(PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR);

				throw err;
			}
		}
	};

	private askFallback = async <T>({
		call,
		recover,
		milliseconds,
		fallbackProvider,
		infuraErr
	}: Pick<FallbackFailure, 'fallbackProvider' | 'infuraErr'> & {
		call: (provider: JsonRpcProvider) => Promise<T>;
		recover?: (params: FallbackFailure) => Promise<T>;
		milliseconds: number;
	}): Promise<T> => {
		try {
			return await withTimeout({ promise: call(fallbackProvider), milliseconds });
		} catch (fallbackErr: unknown) {
			if (isNullish(recover)) {
				throw infuraErr;
			}

			return await recover({ infuraErr, fallbackErr, fallbackProvider });
		}
	};

	// Who submits a signed transaction changes nothing about it: its bytes fix its hash and its nonce,
	// so the network mines at most one copy however many providers it is handed to. That is what
	// makes it safe to hand the same bytes to the fallback when Infura does not accept them, or does
	// not answer in time.
	sendTransaction = async (signedTransaction: string): Promise<TransactionResponse> => {
		try {
			return await this.callWithFallback({
				operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.SUBMISSION,
				milliseconds: INFURA_SUBMISSION_TIMEOUT_MILLISECONDS,
				call: (provider) => provider.broadcastTransaction(signedTransaction),
				recover: async ({ infuraErr, fallbackErr, fallbackProvider }) => {
					// Neither error proves the transaction went nowhere. Infura can pass a transaction on
					// and still fail the request, and a node answers a transaction it already holds with an
					// error of its own. Only the network knows, so it is asked before the send is reported
					// as failed.
					const submitted = await this.findSubmittedTransaction({
						signedTransaction,
						fallbackProvider
					});

					if (nonNullish(submitted)) {
						return submitted;
					}

					// A refusal states something about the transaction; a provider failing the request
					// does not. So the user is told whichever reason there is, Infura's when both give one.
					throw !isEthereumNodeRefusal(infuraErr) && isEthereumNodeRefusal(fallbackErr)
						? fallbackErr
						: infuraErr;
				}
			});
		} catch (err: unknown) {
			// A refusal is the network's answer: the transaction was not accepted. Anything else leaves
			// open whether it reached the network, which the send must say rather than claim either
			// way, since a retry is signed with the next nonce and both could execute.
			throw isEthereumNodeRefusal(err) ? err : new EthSubmissionUnconfirmedError(err);
		}
	};

	// A transaction's hash is the hash of its signed bytes, so it is known before any node answers.
	private findSubmittedTransaction = async ({
		signedTransaction,
		fallbackProvider
	}: {
		signedTransaction: string;
		fallbackProvider: JsonRpcProvider;
	}): Promise<TransactionResponse | null> => {
		try {
			return await withTimeout({
				promise: fallbackProvider.getTransaction(keccak256(signedTransaction)),
				milliseconds: INFURA_READ_TIMEOUT_MILLISECONDS
			});
		} catch (_: unknown) {
			return null;
		}
	};

	// `null` while the transaction is unknown to the node or still unmined; the
	// receipt's `status` is what distinguishes a successful tx from a reverted one.
	getTransactionReceipt = (hash: string): Promise<TransactionReceipt | null> =>
		this.provider.getTransactionReceipt(hash);

	// The pending count is the nonce a send signs with, so it falls back when Infura fails it. The
	// latest count is a confirmed-history read — the one that tells whether a Velora swap was replaced
	// — which no send waits on, and it stays with Infura alone.
	getTransactionCount = ({
		address,
		tag
	}: {
		address: EthAddress;
		tag: 'pending' | 'latest';
	}): Promise<number> =>
		tag === 'pending'
			? this.callWithFallback({
					operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.NONCE,
					milliseconds: INFURA_READ_TIMEOUT_MILLISECONDS,
					call: (provider) => provider.getTransactionCount(address, tag)
				})
			: this.provider.getTransactionCount(address, tag);

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
