import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { CKERC20_ABI } from '$eth/constants/ckerc20.constants';
import { ethersProvider } from '$eth/providers/ethers.providers';
import type { EthAddress } from '$eth/types/address';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { EthersProviderNetwork } from '$eth/types/network';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { Contract, type ContractTransaction } from 'ethers/contract';
import type { JsonRpcProvider } from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraCkErc20Provider {
	private readonly provider: JsonRpcProvider;

	constructor(private readonly network: EthersProviderNetwork) {
		this.provider = ethersProvider(this.network);
	}

	populateTransaction = ({
		contract: { address: contractAddress },
		erc20Contract: { address: erc20ContractAddress },
		to,
		amount
	}: {
		contract: Erc20ContractAddress;
		erc20Contract: Erc20ContractAddress;
		to: EthAddress;
		amount: bigint;
	}): Promise<ContractTransaction> => {
		const erc20Contract = new Contract(contractAddress, CKERC20_ABI, this.provider);
		return erc20Contract.deposit.populateTransaction(erc20ContractAddress, amount, to);
	};
}

const providers: Record<NetworkId, InfuraCkErc20Provider> = SUPPORTED_ETHEREUM_NETWORKS.reduce<
	Record<NetworkId, InfuraCkErc20Provider>
>((acc, network) => ({ ...acc, [network.id]: new InfuraCkErc20Provider(network) }), {});

export const infuraCkErc20Providers = (networkId: NetworkId): InfuraCkErc20Provider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_cketh_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
