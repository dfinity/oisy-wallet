import type { Token } from '$declarations/backend/backend.did';
import {
	SUPPORTED_ETHEREUM_NETWORKS,
	SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS
} from '$env/networks.env';
import { ERC20_CONTRACTS } from '$env/tokens.erc20.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { erc20TokensStore } from '$eth/stores/erc20.store';
import type { Erc20Contract, Erc20Metadata } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Token } from '$eth/utils/erc20.utils';
import { listUserTokens } from '$lib/api/backend.api';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
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
				.filter(({ chain_id }) => SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS.includes(chain_id))
				.map(async ({ contract_address: address, chain_id }: Token): Promise<ContractData> => {
					const network = SUPPORTED_ETHEREUM_NETWORKS.find(
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

		const {
			init: {
				error: { erc20_contracts }
			}
		} = get(i18n);

		toastsError({
			msg: { text: erc20_contracts },
			err
		});

		return { success: false };
	}

	return { success: true };
};
