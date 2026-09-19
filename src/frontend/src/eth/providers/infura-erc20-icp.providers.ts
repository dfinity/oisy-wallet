import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ERC20_ICP_ABI } from '$eth/constants/erc20-icp.constants';
import { ethersProvider } from '$eth/providers/ethers.providers';
import type { EthAddress } from '$eth/types/address';
import type { Erc20Provider, PopulateTransactionParams } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { EthersProviderNetwork } from '$eth/types/network';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { Contract, type ContractTransaction } from 'ethers/contract';
import type { JsonRpcProvider } from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraErc20IcpProvider implements Erc20Provider {
	private readonly provider: JsonRpcProvider;

	constructor(private readonly network: EthersProviderNetwork) {
		this.provider = ethersProvider(this.network);
	}

	getFeeData = ({
		contract: { address: contractAddress },
		from,
		to,
		amount
	}: {
		contract: Erc20ContractAddress;
		to: EthAddress;
		from: EthAddress;
		amount: bigint;
	}): Promise<bigint> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ICP_ABI, this.provider);
		return erc20Contract.burnToAccountId.estimateGas(amount, to, { from });
	};

	/**
	 * @override
	 */
	populateTransaction = ({
		contract: { address: contractAddress },
		to,
		amount
	}: PopulateTransactionParams & { amount: bigint }): Promise<ContractTransaction> => {
		const erc20Contract = new Contract(contractAddress, ERC20_ICP_ABI, this.provider);
		return erc20Contract.burnToAccountId.populateTransaction(amount, to);
	};
}

const providers: Record<NetworkId, InfuraErc20IcpProvider> = SUPPORTED_ETHEREUM_NETWORKS.reduce<
	Record<NetworkId, InfuraErc20IcpProvider>
>((acc, network) => ({ ...acc, [network.id]: new InfuraErc20IcpProvider(network) }), {});

export const infuraErc20IcpProviders = (networkId: NetworkId): InfuraErc20IcpProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_erc20_icp_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
