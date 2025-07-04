import type { UserToken } from '$declarations/backend/backend.did';
import {
	SUPPORTED_EVM_NETWORKS,
	SUPPORTED_EVM_NETWORKS_CHAIN_IDS
} from '$env/networks/networks-evm/networks.evm.env';
import {
	SUPPORTED_ETHEREUM_NETWORKS,
	SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS
} from '$env/networks/networks.eth.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import {
	ADDITIONAL_ERC20_TOKENS,
	ERC20_CONTRACTS,
	ERC20_TWIN_TOKENS
} from '$env/tokens/tokens.erc20.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Token, mapErc20UserToken } from '$eth/utils/erc20.utils';
import { listUserTokens } from '$lib/api/backend.api';
import { getIdbEthTokensDeprecated, setIdbEthTokensDeprecated } from '$lib/api/idb-tokens.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsErrorNoTrace } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { UserTokenState } from '$lib/types/token-toggleable';
import type { LoadUserTokenParams } from '$lib/types/user-token';
import type { ResultSuccess } from '$lib/types/utils';
import {
	assertNonNullish,
	fromNullable,
	isNullish,
	nonNullish,
	queryAndUpdate
} from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadErc20Tokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<void> => {
	await Promise.all([loadDefaultErc20Tokens(), loadErc20UserTokens({ identity, useCache: true })]);
};

const ALL_DEFAULT_ERC20_TOKENS = [
	...ERC20_TWIN_TOKENS,
	...EVM_ERC20_TOKENS,
	...ADDITIONAL_ERC20_TOKENS
];

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
		erc20DefaultTokensStore.set([...ALL_DEFAULT_ERC20_TOKENS, ...contracts.map(mapErc20Token)]);
	} catch (err: unknown) {
		erc20DefaultTokensStore.reset();

		toastsErrorNoTrace({
			msg: { text: get(i18n).init.error.erc20_contracts },
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const loadErc20UserTokens = ({
	identity,
	useCache = false
}: Omit<LoadUserTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<Erc20UserToken[]>({
		request: (params) => loadUserTokens({ ...params, useCache }),
		onLoad: loadUserTokenData,
		onUpdateError: ({ error: err }) => {
			erc20UserTokensStore.resetAll();

			toastsErrorNoTrace({
				msg: { text: get(i18n).init.error.erc20_user_tokens },
				err
			});
		},
		identity
	});

const loadUserTokensFromBackend = async ({
	identity,
	certified
}: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<UserToken[]> => {
	const contracts = await listUserTokens({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	// Caching the custom tokens in the IDB if update call
	if (certified && contracts.length > 0) {
		await setIdbEthTokensDeprecated({ identity, tokens: contracts });
	}

	return contracts;
};

const loadNetworkUserTokens = async ({
	identity,
	certified,
	useCache = false
}: LoadUserTokenParams): Promise<UserToken[]> => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return [];
	}

	if (useCache && !certified) {
		const cachedTokens = await getIdbEthTokensDeprecated(identity.getPrincipal());

		if (nonNullish(cachedTokens)) {
			return cachedTokens;
		}
	}

	return await loadUserTokensFromBackend({
		identity,
		certified
	});
};

const loadUserTokens = async (params: LoadUserTokenParams): Promise<Erc20UserToken[]> => {
	type ContractData = Erc20Contract &
		Erc20Metadata & { network: EthereumNetwork } & Pick<Erc20Token, 'category'> &
		Partial<Pick<Erc20Token, 'id'>>;

	type ContractDataWithCustomToken = ContractData & UserTokenState;

	const loadUserContracts = async (): Promise<Promise<ContractDataWithCustomToken>[]> => {
		const contracts = await loadNetworkUserTokens(params);

		return contracts
			.filter(({ chain_id }) =>
				[...SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS, ...SUPPORTED_EVM_NETWORKS_CHAIN_IDS].includes(
					chain_id
				)
			)
			.map(
				async ({
					contract_address: address,
					chain_id,
					version,
					enabled
				}: UserToken): Promise<ContractDataWithCustomToken> => {
					// Check it the user token is actually a match in the environment static metadata
					const existingToken = ALL_DEFAULT_ERC20_TOKENS.find(
						({ address: tokenAddress, network }) =>
							tokenAddress.toLowerCase() === address.toLowerCase() && network.chainId === chain_id
					);

					if (nonNullish(existingToken)) {
						return {
							...existingToken,
							network: existingToken.network,
							category: 'custom' as const,
							version: fromNullable(version),
							enabled: fromNullable(enabled) ?? true
						};
					}

					const network = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
						({ chainId }) => chainId === chain_id
					);

					// This should not happen because we filter the chain_id in the previous filter, but we need it to be type safe
					assertNonNullish(
						network,
						`Inconsistency in network data: no network found for chainId ${chain_id} in user token, even though it is in the environment`
					);

					return {
						...{
							address,
							exchange: 'erc20' as const,
							category: 'custom' as const,
							network,
							version: fromNullable(version),
							enabled: fromNullable(enabled) ?? true
						},
						// TODO(GIX-2740): check if metadata for address already loaded in store and reuse - using Infura is not a certified call anyway
						...(await infuraErc20Providers(network.id).metadata({ address }))
					};
				}
			);
	};

	const userContracts = await loadUserContracts();

	const contracts = await Promise.all(userContracts);
	return contracts.map(mapErc20UserToken);
};

const loadUserTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc20UserToken[];
}) => {
	erc20UserTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
