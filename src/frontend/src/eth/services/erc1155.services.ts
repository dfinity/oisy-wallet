import type { CustomToken } from '$declarations/backend/declarations/backend.did';
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import type { Erc1155ContractAddress } from '$eth/types/erc1155';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import { mapTokenSection } from '$lib/utils/custom-token-section.utils';
import { parseCustomTokenId } from '$lib/utils/custom-token.utils';
import { assertNonNullish, fromNullable, nonNullish, queryAndUpdate } from '@dfinity/utils';
import { get } from 'svelte/store';

export const isInterfaceErc1155 = async ({
	networkId,
	address
}: {
	networkId: NetworkId;
	address: Erc1155ContractAddress['address'];
}): Promise<boolean> => {
	const { isInterfaceErc1155 } = infuraErc1155Providers(networkId);

	return await isInterfaceErc1155({ address });
};

export const loadErc1155Tokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<void> => {
	await Promise.all([loadCustomTokens({ identity, useCache: true })]);
};

export const loadCustomTokens = ({
	identity,
	useCache = false
}: Omit<LoadCustomTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<Erc1155CustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError: ({ error: err }) => {
			erc1155CustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.erc1155_custom_tokens },
				err
			});
		},
		identity
	});

const loadErc1155CustomTokens = async (params: LoadCustomTokenParams): Promise<CustomToken[]> =>
	await loadNetworkCustomTokens({
		...params,
		filterTokens: ({ token }) => 'Erc1155' in token
	});

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<Erc1155CustomToken[]> => {
	const loadCustomContracts = async (): Promise<Erc1155CustomToken[]> => {
		const erc1155CustomTokens: CustomToken[] = await loadErc1155CustomTokens(params);

		return await erc1155CustomTokens.reduce<Promise<Erc1155CustomToken[]>>(
			async (
				acc,
				{
					token,
					enabled,
					version: versionNullable,
					section: sectionNullable,
					allow_external_content_source: allowExternalContentSourceNullable
				}
			) => {
				if (!('Erc1155' in token)) {
					return acc;
				}

				const version = fromNullable(versionNullable);
				const section = fromNullable(sectionNullable);
				const mappedSection = nonNullish(section) ? mapTokenSection(section) : undefined;
				const allowExternalContentSource = fromNullable(allowExternalContentSourceNullable);

				const {
					Erc1155: { token_address: tokenAddress, chain_id: tokenChainId }
				} = token;

				const network = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
					({ chainId }) => tokenChainId === chainId
				);

				// This should not happen because we filter the chain_id in the previous filter, but we need it to be type safe
				assertNonNullish(
					network,
					`Inconsistency in network data: no network found for chainId ${tokenChainId} in custom token, even though it is in the environment`
				);

				const { getContractMetadata } = alchemyProviders(network.id);
				const metadata = await getContractMetadata(tokenAddress);

				return [
					...(await acc),
					{
						...{
							id: parseCustomTokenId({ identifier: tokenAddress, chainId: network.chainId }),
							name: tokenAddress,
							address: tokenAddress,
							network,
							symbol: tokenAddress,
							decimals: 0, // Erc1155 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
							standard: 'erc1155' as const,
							category: 'custom' as const,
							enabled,
							version,
							...(nonNullish(mappedSection) && {
								section: mappedSection
							}),
							allowExternalContentSource
						},
						...metadata
					}
				];
			},
			Promise.resolve([])
		);
	};

	return await loadCustomContracts();
};

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc1155CustomToken[];
}) => {
	erc1155CustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
