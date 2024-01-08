import type { Token } from '$declarations/backend/backend.did';
import type { Erc20Contract, Erc20Metadata } from '$eth/types/erc20';
import { mapErc20Token } from '$eth/utils/erc20.utils';
import { listUserTokens } from '$lib/api/backend.api';
import { authStore } from '$lib/stores/auth.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import { ERC20_CONTRACTS } from '../constants/erc20.constants';
import { metadata } from '../providers/infura-erc20.providers';
import { erc20TokensStore } from '../stores/erc20.store';

export const loadErc20Contracts = async (): Promise<{ success: boolean }> => {
	try {
		type ContractData = Erc20Contract & Erc20Metadata;

		const loadKnownContracts = (): Promise<ContractData>[] =>
			ERC20_CONTRACTS.map(
				async (contract): Promise<ContractData> => ({
					...contract,
					...(await metadata(contract))
				})
			);

		const loadUserContracts = async (): Promise<Promise<ContractData>[]> => {
			const { identity } = get(authStore);

			if (isNullish(identity)) {
				return [];
			}

			const contracts = await listUserTokens({ identity });

			return contracts.map(
				async ({ contract_address: address }: Token): Promise<ContractData> => ({
					...{ address, exchange: 'erc20' as const },
					...(await metadata({ address }))
				})
			);
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
