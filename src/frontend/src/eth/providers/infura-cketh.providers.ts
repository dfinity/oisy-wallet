import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.env';
import { INFURA_NETWORK_HOMESTEAD, INFURA_NETWORK_SEPOLIA } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { CKETH_ABI } from '$eth/constants/cketh.constants';
import type { ContractAddress } from '$eth/types/address';
import type { Erc20Provider } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { ethers, type ContractTransaction } from 'ethers';
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
		const ckEthContract = new ethers.Contract(contractAddress, CKETH_ABI, this.provider);
		return ckEthContract.deposit.estimateGas(to, { from });
	};

	populateTransaction = ({
		contract: { address: contractAddress },
		to
	}: {
		contract: ContractAddress;
		to: EthAddress;
	}): Promise<ContractTransaction> => {
		const ckEthContract = new ethers.Contract(contractAddress, CKETH_ABI, this.provider);
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
	}): Promise<Log[]> =>
		this.provider.getLogs({
			fromBlock,
			toBlock: 'latest',
			address: contractAddress,
			topics
		});
}

const providers: Record<NetworkId, InfuraCkETHProvider> = {
	[ETHEREUM_NETWORK_ID]: new InfuraCkETHProvider(INFURA_NETWORK_HOMESTEAD),
	[SEPOLIA_NETWORK_ID]: new InfuraCkETHProvider(INFURA_NETWORK_SEPOLIA)
};

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
