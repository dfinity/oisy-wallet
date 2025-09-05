import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { CKETH_ABI } from '$eth/constants/cketh.constants';
import type { ContractAddress } from '$eth/types/address';
import type { Erc20Provider } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import { TRACK_INFURA_GET_LOGS_CALL } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { Contract, type ContractTransaction } from 'ethers/contract';
import { InfuraProvider, type BlockTag, type Log, type Networkish } from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraCkETHProvider implements Erc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
	}

	getFeeData = ({
		contract: { address: contractAddress },
		from,
		to
	}: {
		contract: Erc20ContractAddress;
		from: EthAddress;
		to: EthAddress;
		amount: bigint;
	}): Promise<bigint> => {
		const ckEthContract = new Contract(contractAddress, CKETH_ABI, this.provider);
		return ckEthContract.deposit.estimateGas(to, { from });
	};

	populateTransaction = ({
		contract: { address: contractAddress },
		to
	}: {
		contract: ContractAddress;
		to: EthAddress;
	}): Promise<ContractTransaction> => {
		const ckEthContract = new Contract(contractAddress, CKETH_ABI, this.provider);
		return ckEthContract.deposit.populateTransaction(to);
	};

	getLogs = ({
		contract: { address: contractAddress },
		startBlock: fromBlock,
		topics
	}: {
		contract: ContractAddress;
		startBlock?: BlockTag;
		topics: (string | null)[];
	}): Promise<Log[]> => {
		try {
			// We have sudden spikes in the number of getLogs calls to Infura, which is causing issues.
			// However, we are not sure when and how they happen.
			// This event is used to track the number of calls to Infura's getLogs endpoint.
			// TODO: Remove this event once the issue is resolved.
			trackEvent({
				name: TRACK_INFURA_GET_LOGS_CALL,
				metadata: {
					network: this.network.toString(),
					contractAddress,
					fromBlock: fromBlock?.toString() ?? 'latest',
					topics: topics.join(',')
				}
			});
		} catch (_: unknown) {
			// We don't really care if we cannot track the event, so we just ignore any errors here.
		}

		return this.provider.getLogs({
			fromBlock,
			toBlock: 'latest',
			address: contractAddress,
			topics
		});
	};
}

const providers: Record<NetworkId, InfuraCkETHProvider> = SUPPORTED_ETHEREUM_NETWORKS.reduce<
	Record<NetworkId, InfuraCkETHProvider>
>((acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraCkETHProvider(infura) }), {});

export const infuraCkETHProviders = (networkId: NetworkId): InfuraCkETHProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_cketh_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
