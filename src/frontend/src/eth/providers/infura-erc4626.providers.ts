import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ERC4626_ABI } from '$eth/constants/erc4626.constants';
import { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import type { Erc20ContractAddress } from '$eth/types/address';
import type { Erc4626ContractAddress } from '$eth/types/erc4626';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { get } from 'svelte/store';

export class InfuraErc4626Provider extends InfuraErc20Provider {
	isInterfaceErc4626 = async (contract: Erc4626ContractAddress): Promise<boolean> => {
		const vault = new Contract(contract, ERC4626_ABI, this.provider);

		try {
			const asset = await vault.asset();
			const totalAssets = await vault.totalAssets();

			return nonNullish(asset) && nonNullish(totalAssets);
		} catch (_: unknown) {
			return false;
		}
	};

	getAssetAddress = async (contract: Erc4626ContractAddress): Promise<Erc20ContractAddress> => {
		const vault = new Contract(contract, ERC4626_ABI, this.provider);
		return await vault.asset();
	};

	convertToAssets = async ({
		contract,
		shares
	}: {
		contract: Erc4626ContractAddress;
		shares: bigint;
	}): Promise<bigint> => {
		const vault = new Contract(contract, ERC4626_ABI, this.provider);
		return await vault.convertToAssets(shares);
	};
}

const providers: Record<NetworkId, InfuraErc4626Provider> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<NetworkId, InfuraErc4626Provider>>(
	(acc, { id, providers: { infura } }) => ({ ...acc, [id]: new InfuraErc4626Provider(infura) }),
	{}
);

export const infuraErc4626Providers = (networkId: NetworkId): InfuraErc4626Provider => {
	const provider = providers[networkId];

	assertNonNullish(
		provider,
		replacePlaceholders(get(i18n).init.error.no_infura_erc4626_provider, {
			$network: networkId.toString()
		})
	);

	return provider;
};
