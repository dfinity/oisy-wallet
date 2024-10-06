import { ERC20_CONTRACTS, ERC20_TWIN_TOKENS } from '$env/tokens.erc20.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Token } from '$eth/utils/erc20.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ResultSuccess } from '$lib/types/utils';
import { get } from 'svelte/store';

export const loadErc20Tokens = async (): Promise<void> => {
	await loadDefaultErc20Tokens();
};

// TODO(GIX-2740): use environment static metadata
const loadDefaultErc20Tokens = async (): Promise<ResultSuccess> => {
	try {
		type ContractData = Erc20Contract &
			Erc20Metadata & { network: EthereumNetwork } & Pick<Erc20Token, 'category'> &
			Partial<Pick<Erc20Token, 'id'>>;

		const loadKnownContracts = (): Promise<ContractData>[] =>
			ERC20_CONTRACTS.map(
				async ({ network, ...contract }): Promise<ContractData> => ({
					...contract,
					network,
					category: 'default',
					...(await infuraErc20Providers(network.id).metadata(contract))
				})
			);

		const contracts = await Promise.all(loadKnownContracts());
		erc20DefaultTokensStore.set([...ERC20_TWIN_TOKENS, ...contracts.map(mapErc20Token)]);
	} catch (err: unknown) {
		erc20DefaultTokensStore.reset();

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
