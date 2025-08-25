import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { INFURA_NETWORK_HOMESTEAD, INFURA_NETWORK_SEPOLIA } from '$env/networks.eth.env';
import { CKETH_ABI } from '$eth/constants/cketh.constants';
import type { ContractAddress } from '$eth/types/address';
import type { Erc20Provider } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import { i18n } from '$lib/stores/i18n.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import type { BlockTag } from '@ethersproject/abstract-provider';
import type { BigNumber } from '@ethersproject/bignumber';
import type { PopulatedTransaction } from '@ethersproject/contracts';
import type { Networkish } from '@ethersproject/networks';
import { InfuraProvider } from '@ethersproject/providers';
import type { Log } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { get } from 'svelte/store';

const API_KEY = import.meta.env.VITE_INFURA_API_KEY;

export class InfuraCkETHProvider implements Erc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, API_KEY);
	}

	getFeeData = ({
		contract: { address: contractAddress },
		from,
		to
	}: {
		contract: Erc20ContractAddress;
		from: ETH_ADDRESS;
		to: ETH_ADDRESS;
		amount: BigNumber;
	}): Promise<BigNumber> => {
		const ckEthContract = new ethers.Contract(contractAddress, CKETH_ABI, this.provider);
		return ckEthContract.estimateGas.deposit(to, { from });
	};

	populateTransaction = ({
		contract: { address: contractAddress },
		to
	}: {
		contract: ContractAddress;
		to: ETH_ADDRESS;
	}): Promise<PopulatedTransaction> => {
		const ckEthContract = new ethers.Contract(contractAddress, CKETH_ABI, this.provider);
		return ckEthContract.populateTransaction.deposit(to);
	};

	getLogs = async ({
		contract: { address: contractAddress },
		startBlock: fromBlock,
		topics
	}: {
		contract: ContractAddress;
		startBlock?: BlockTag;
		topics: (string | null)[];
	}): Promise<Log[]> => {
		return this.provider.getLogs({
			fromBlock,
			toBlock: 'latest',
			address: contractAddress,
			topics
		});
	};
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
