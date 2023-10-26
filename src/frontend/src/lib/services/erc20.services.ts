import { ERC20_CONTRACTS_ADDRESSES } from '$lib/constants/erc20.constants';
import { metadata } from '$lib/providers/infura-erc20.providers';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import { toastsError } from '$lib/stores/toasts.store';
import { mapErc20Token } from '$lib/utils/erc20.utils';

export const loadErc20Contracts = async (): Promise<{ success: boolean }> => {
	try {
		const contracts = await Promise.all(
			ERC20_CONTRACTS_ADDRESSES.map(async (contract) => ({
				...contract,
				...(await metadata(contract))
			}))
		);
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
