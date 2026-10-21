import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import { LIFI_WHITELIST_MANAGER_ABI } from '$eth/constants/lifi.constants';
import { ethersProvider } from '$eth/providers/ethers.providers';
import type { EthAddress } from '$eth/types/address';
import type { EthersProviderNetwork } from '$eth/types/network';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import type { JsonRpcProvider } from 'ethers/providers';
import { get } from 'svelte/store';

export class InfuraLifiProvider {
	private readonly provider: JsonRpcProvider;

	constructor(private readonly network: EthersProviderNetwork) {
		this.provider = ethersProvider(this.network);
	}

	// `WhitelistManagerFacet.isContractSelectorWhitelisted`, read through the Diamond as an `eth_call`:
	// the same check the Diamond makes before running a swap call, made before signing instead.
	isContractSelectorWhitelisted = ({
		diamond,
		contract,
		selector
	}: {
		diamond: EthAddress;
		contract: string;
		selector: string;
	}): Promise<boolean> =>
		new Contract(diamond, LIFI_WHITELIST_MANAGER_ABI, this.provider).isContractSelectorWhitelisted(
			contract,
			selector
		);

	// What `owner` allows `spender` to take of the ERC-20 at `token`, read by its address alone.
	allowance = ({
		token,
		owner,
		spender
	}: {
		token: string;
		owner: string;
		spender: EthAddress;
	}): Promise<bigint> => new Contract(token, ERC20_ABI, this.provider).allowance(owner, spender);
}

const providers: Record<NetworkId, InfuraLifiProvider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, InfuraLifiProvider>>(
	(acc, network) => ({ ...acc, [network.id]: new InfuraLifiProvider(network) }),
	{}
);

export const infuraLifiProviders = (networkId: NetworkId): InfuraLifiProvider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
