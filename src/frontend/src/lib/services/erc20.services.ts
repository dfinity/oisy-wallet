import { ERC20_CONTRACTS } from '$lib/constants/erc20.constants';
import { metadata } from '$lib/providers/erc20.providers';
import { balancesStore } from '$lib/stores/balances.store';
import { erc20ContractsStore } from '$lib/stores/erc20-contracts.store';
import { toastsError } from '$lib/stores/toasts.store';

export const loadErc20Contracts = async (): Promise<{ success: boolean }> => {
	try {
		const contracts = await Promise.all(
			ERC20_CONTRACTS.map(async (contract) => ({
				...contract,
				...(await metadata(contract))
			}))
		);
		erc20ContractsStore.set(contracts);
	} catch (err: unknown) {
		balancesStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ERC20 contracts.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
