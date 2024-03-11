import type { Token } from '$declarations/backend/backend.did';
import { ERC20_CONTRACTS } from '$eth/constants/erc20.constants';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { erc20TokensStore } from '$eth/stores/erc20.store';
import type { Erc20Contract, Erc20Metadata } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Token } from '$eth/utils/erc20.utils';
import {
	ETHEREUM_NETWORKS,
	ETHEREUM_NETWORKS_CHAIN_IDS
} from '$icp-eth/constants/networks.constants';
import { listUserTokens } from '$lib/api/backend.api';
import { authStore } from '$lib/stores/auth.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadErc20Contracts = async (): Promise<{ success: boolean }> => {
	try {
		type ContractData = Erc20Contract & Erc20Metadata & { network: EthereumNetwork };

		const loadKnownContracts = (): Promise<ContractData>[] =>
			ERC20_CONTRACTS.map(
				async ({ network, ...contract }): Promise<ContractData> => ({
					...contract,
					network,
					...(await infuraErc20Providers(network.id).metadata(contract))
				})
			);

		const loadUserContracts = async (): Promise<Promise<ContractData>[]> => {
			const { identity } = get(authStore);

			if (isNullish(identity)) {
				return [];
			}

			const contracts = await listUserTokens({ identity });

			return contracts
				.filter(({ chain_id }) => ETHEREUM_NETWORKS_CHAIN_IDS.includes(chain_id))
				.map(async ({ contract_address: address, chain_id }: Token): Promise<ContractData> => {
					const network = ETHEREUM_NETWORKS.find(
						({ chainId }) => chainId === chain_id
					) as EthereumNetwork;

					return {
						...{
							address,
							exchange: 'erc20' as const,
							network
						},
						...(await infuraErc20Providers(network.id).metadata({ address }))
					};
				});
		};

		const userContracts = await loadUserContracts();

		const contracts = await Promise.all([...loadKnownContracts(), ...userContracts]);
		erc20TokensStore.set(contracts.map(mapErc20Token));
	} catch (err: unknown) {
		erc20TokensStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ERC20 contracts.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
