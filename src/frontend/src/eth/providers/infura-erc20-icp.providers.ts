import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import { ERC20_ICP_ABI } from '$eth/constants/erc20-icp.constants';
import type { Erc20Provider, PopulateTransactionParams } from '$eth/types/contracts-providers';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { Contract, type ContractTransaction } from 'ethers/contract';
import { InfuraProvider, type Networkish } from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraErc20IcpProvider implements Erc20Provider {
	private readonly provider: InfuraProvider;

	constructor(private readonly network: Networkish) {
		this.provider = new InfuraProvider(this.network, INFURA_API_KEY);
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
>(
	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraErc20IcpProvider(infura) }),
	{}
);

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
