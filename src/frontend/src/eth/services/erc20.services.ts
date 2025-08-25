import type { UserToken } from '$declarations/backend/backend.did';
import {
	SUPPORTED_ETHEREUM_NETWORKS,
	SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS
} from '$env/networks.env';
import { ERC20_CONTRACTS, ERC20_TWIN_TOKENS } from '$env/tokens.erc20.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Token, mapErc20UserToken } from '$eth/utils/erc20.utils';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { listUserTokens } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { UserTokenState } from '$lib/types/token-toggleable';
import { fromNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadErc20Tokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<void> => {
	await Promise.all([loadDefaultErc20Tokens(), loadUserTokens({ identity })]);
};

const loadDefaultErc20Tokens = async (): Promise<{ success: boolean }> => {
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

export const loadUserTokens = ({ identity }: { identity: OptionIdentity }): Promise<void> =>
	queryAndUpdate<Erc20UserToken[]>({
		request: (params) => loadErc20UserTokens(params),
		onLoad: loadErc20UserTokenData,
		onCertifiedError: ({ error: err }) => {
			erc20UserTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.erc20_user_tokens },
				err
			});
		},
		identity
	});

const loadErc20UserTokens = async (params: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<Erc20UserToken[]> => {
	type ContractData = Erc20Contract &
		Erc20Metadata & { network: EthereumNetwork } & Pick<Erc20Token, 'category'> &
		Partial<Pick<Erc20Token, 'id'>>;

	type ContractDataWithCustomToken = ContractData & UserTokenState;

	const loadUserContracts = async (): Promise<Promise<ContractDataWithCustomToken>[]> => {
		const contracts = await listUserTokens(params);

		return contracts
			.filter(({ chain_id }) => SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS.includes(chain_id))
			.map(
				async ({
					contract_address: address,
					chain_id,
					version,
					enabled
				}: UserToken): Promise<ContractDataWithCustomToken> => {
					const network = SUPPORTED_ETHEREUM_NETWORKS.find(
						({ chainId }) => chainId === chain_id
					) as EthereumNetwork;

					return {
						...{
							address,
							exchange: 'erc20' as const,
							category: 'custom' as const,
							network,
							version: fromNullable(version),
							enabled: fromNullable(enabled) ?? true
						},
						...(await infuraErc20Providers(network.id).metadata({ address }))
					};
				}
			);
	};

	const userContracts = await loadUserContracts();

	const contracts = await Promise.all(userContracts);
	return contracts.map(mapErc20UserToken);
};

const loadErc20UserTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc20UserToken[];
}) => {
	erc20UserTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
