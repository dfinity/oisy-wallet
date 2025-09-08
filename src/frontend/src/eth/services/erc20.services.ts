import type { CustomToken, UserToken } from '$declarations/backend/backend.did';
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
import { ETHEREUM_DEFAULT_DECIMALS } from '$env/tokens/tokens.eth.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20ContractAddress } from '$eth/types/address';
import type { Erc20Contract, Erc20Metadata, Erc20Token } from '$eth/types/erc20';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import { mapErc20Icon, mapErc20Token, mapErc20UserToken } from '$eth/utils/erc20.utils';
import { listUserTokens } from '$lib/api/backend.api';
import { getIdbEthTokensDeprecated, setIdbEthTokensDeprecated } from '$lib/api/idb-tokens.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError, toastsErrorNoTrace } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { UserTokenState } from '$lib/types/token-toggleable';
import type { LoadUserTokenParams } from '$lib/types/user-token';
import type { ResultSuccess } from '$lib/types/utils';
import { parseCustomTokenId } from '$lib/utils/custom-token.utils';
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
	await Promise.all([
		loadDefaultErc20Tokens(),
		loadErc20UserTokens({ identity, useCache: true }),
		loadCustomTokens({ identity, useCache: true })
	]);
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

export const loadCustomTokens = ({
	identity,
	useCache = false
}: Omit<LoadCustomTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<Erc20CustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError: ({ error: err }) => {
			erc20CustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.erc20_custom_tokens },
				err
			});
		},
		identity
	});

// TODO: UserToken is deprecated - remove this when the migration to CustomToken is complete
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

const loadErc20CustomTokens = async (params: LoadCustomTokenParams): Promise<CustomToken[]> =>
	await loadNetworkCustomTokens({
		...params,
		filterTokens: ({ token }) => 'Erc20' in token
	});

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<Erc20CustomToken[]> => {
	const loadCustomContracts = async (): Promise<Erc20CustomToken[]> => {
		const erc20CustomTokens = await loadErc20CustomTokens(params);

		const [existingTokens, nonExistingTokens] = erc20CustomTokens.reduce<
			[Erc20CustomToken[], Erc20CustomToken[]]
		>(
			([accExisting, accNonExisting], { token, enabled, version: versionNullable }) => {
				if (!('Erc20' in token)) {
					return [accExisting, accNonExisting];
				}

				if (
					![...SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS, ...SUPPORTED_EVM_NETWORKS_CHAIN_IDS].includes(
						token.Erc20.chain_id
					)
				) {
					return [accExisting, accNonExisting];
				}

				const version = fromNullable(versionNullable);

				const {
					Erc20: { token_address: tokenAddress, chain_id: tokenChainId }
				} = token;

				const existingToken = ALL_DEFAULT_ERC20_TOKENS.find(
					({ address, network: { chainId } }) =>
						tokenAddress.toLowerCase() === address.toLowerCase() && tokenChainId === chainId
				);

				if (nonNullish(existingToken)) {
					return [[...accExisting, { ...existingToken, enabled, version }], accNonExisting];
				}

				const network = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
					({ chainId }) => tokenChainId === chainId
				);

				// This should not happen because we filter the chain_id in the previous filter, but we need it to be type safe
				assertNonNullish(
					network,
					`Inconsistency in network data: no network found for chainId ${tokenChainId} in custom token, even though it is in the environment`
				);

				return [
					accExisting,
					[
						...accNonExisting,
						{
							id: parseCustomTokenId({ identifier: tokenAddress, chainId: network.chainId }),
							name: tokenAddress,
							address: tokenAddress,
							network,
							symbol: tokenAddress,
							decimals: ETHEREUM_DEFAULT_DECIMALS,
							standard: 'erc20' as const,
							category: 'custom' as const,
							exchange: 'erc20' as const,
							enabled,
							version
						}
					]
				];
			},
			[[], []]
		);

		const safeLoadMetadata = async ({
			networkId,
			address
		}: {
			networkId: NetworkId;
			address: Erc20ContractAddress;
		}) => {
			try {
				// TODO(GIX-2740): check if metadata for address already loaded in store and reuse - using Infura is not a certified call anyway
				return await infuraErc20Providers(networkId).metadata({ address });
			} catch (err: unknown) {
				console.error(
					`Error loading metadata for custom ERC20 token ${address} on network ${networkId.description}`,
					err
				);
				return undefined;
			}
		};

		const customTokens: Erc20CustomToken[] = await nonExistingTokens.reduce<
			Promise<Erc20CustomToken[]>
		>(async (acc, token) => {
			const {
				network: { id: networkId },
				address
			} = token;

			const metadata = await safeLoadMetadata({ networkId, address });

			return nonNullish(metadata)
				? [...(await acc), { ...token, icon: mapErc20Icon(metadata.symbol), ...metadata }]
				: acc;
		}, Promise.resolve([]));

		return [...existingTokens, ...customTokens];
	};

	return await loadCustomContracts();
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

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc20CustomToken[];
}) => {
	erc20CustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
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
