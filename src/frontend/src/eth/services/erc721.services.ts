import type { CustomToken, ErcToken } from '$declarations/backend/backend.did';
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { infuraErc721Providers } from '$eth/providers/infura-erc721.providers';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc721ContractAddress } from '$eth/types/erc721';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { getIdbEthTokens, setIdbEthTokens } from '$lib/api/idb-tokens.api';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import { parseCustomTokenId } from '$lib/utils/custom-token.utils';
import { assertNonNullish, fromNullable, nonNullish, queryAndUpdate } from '@dfinity/utils';
import { get } from 'svelte/store';

export const isInterfaceErc721 = async ({
	networkId,
	address
}: {
	networkId: NetworkId;
	address: Erc721ContractAddress['address'];
}): Promise<boolean> => {
	const { isInterfaceErc721 } = infuraErc721Providers(networkId);

	return await isInterfaceErc721({ address });
};

export const loadErc721Tokens = async ({
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
	queryAndUpdate<Erc721CustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError: ({ error: err }) => {
			erc721CustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.erc721_custom_tokens },
				err
			});
		},
		identity
	});

const loadErc721CustomTokens = async (params: LoadCustomTokenParams): Promise<CustomToken[]> =>
	await loadNetworkCustomTokens({
		...params,
		filterTokens: ({ token }) => 'Erc721' in token,
		setIdbTokens: setIdbEthTokens,
		getIdbTokens: getIdbEthTokens
	});

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<Erc721CustomToken[]> => {
	const loadCustomContracts = async (): Promise<Erc721CustomToken[]> => {
		const erc721CustomTokens: CustomToken[] = await loadErc721CustomTokens(params);

		const customTokenPromises = erc721CustomTokens
			.filter(
				(customToken): customToken is CustomToken & { token: { Erc721: ErcToken } } =>
					'Erc721' in customToken.token
			)
			.map(async ({ token, enabled, version: versionNullable, section: sectionNullable }) => {
				const version = fromNullable(versionNullable);
				const section = fromNullable(sectionNullable);

				const {
					Erc721: { token_address: tokenAddress, chain_id: tokenChainId }
				} = token;

				const network = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
					({ chainId }) => tokenChainId === chainId
				);

				// This should not happen because we filter the chain_id in the previous filter, but we need it to be type safe
				assertNonNullish(
					network,
					`Inconsistency in network data: no network found for chainId ${tokenChainId} in custom token, even though it is in the environment`
				);

				const metadata = await infuraErc721Providers(network.id).metadata({
					address: tokenAddress
				});
				const { symbol } = metadata;

				return {
					...{
						id: parseCustomTokenId({ identifier: symbol, chainId: network.chainId }),
						name: tokenAddress,
						address: tokenAddress,
						network,
						symbol,
						decimals: 0, // Erc721 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
						standard: 'erc721' as const,
						category: 'custom' as const,
						enabled,
						version,
						...(nonNullish(section) && {
							section: 'Spam' in section ? CustomTokenSection.SPAM : CustomTokenSection.HIDDEN
						})
					},
					...metadata
				};
			});

		return Promise.all(customTokenPromises);
	};

	const customContracts = await loadCustomContracts();
	return await Promise.all(customContracts);
};

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc721CustomToken[];
}) => {
	erc721CustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
