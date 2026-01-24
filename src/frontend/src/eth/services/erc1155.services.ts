import type { CustomToken, ErcToken } from '$declarations/backend/backend.did';
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { infuraErc1155Providers } from '$eth/providers/infura-erc1155.providers';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import type { Erc1155ContractAddress } from '$eth/types/erc1155';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SUBCONTEXT_NFT
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { mapBackendTokens } from '$lib/services/load-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import { mapTokenSection } from '$lib/utils/custom-token-section.utils';
import { parseCustomTokenId } from '$lib/utils/custom-token.utils';
import {
	assertNonNullish,
	fromNullable,
	isNullish,
	nonNullish,
	queryAndUpdate
} from '@dfinity/utils';
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

const safeLoadMetadata = async ({
	networkId,
	address
}: {
	networkId: NetworkId;
	address: Erc1155ContractAddress['address'];
}) => {
	try {
		const { getContractMetadata } = alchemyProviders(networkId);

		return await getContractMetadata(address);
	} catch (err: unknown) {
		trackEvent({
			name: PLAUSIBLE_EVENTS.LOAD_CUSTOM_TOKENS,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_NFT.ERC1155,
				token_address: address,
				token_network: `${networkId.description}`
			},
			warning: `Error loading metadata for custom ERC1155 token ${address} on network ${networkId.description}. ${err}`
		});
	}
};

type CustomTokenErc1155Variant = Omit<CustomToken, 'token'> & { token: { Erc1155: ErcToken } };

const filterErc1155CustomToken = (
	customToken: CustomToken
): customToken is CustomTokenErc1155Variant => 'Erc1155' in customToken.token;

const mapErc1155CustomToken = async ({
	token,
	enabled,
	version: versionNullable,
	section: sectionNullable,
	allow_external_content_source: allowExternalContentSourceNullable
}: CustomTokenErc1155Variant): Promise<Erc1155CustomToken | undefined> => {
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

	const metadata = await safeLoadMetadata({ networkId: network.id, address: tokenAddress });

	if (isNullish(metadata)) {
		return;
	}

	return {
		...{
			id: parseCustomTokenId({ identifier: tokenAddress, chainId: network.chainId }),
			name: tokenAddress,
			address: tokenAddress,
			network,
			symbol: metadata.symbol ?? '', // The symbol is used with the amount, no issue with having it empty for NFTs
			decimals: 0, // Erc1155 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
			standard: { code: 'erc1155' as const },
			category: 'custom' as const,
			enabled,
			version,
			...(nonNullish(mappedSection) && {
				section: mappedSection
			}),
			allowExternalContentSource
		},
		...metadata
	};
};

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<Erc1155CustomToken[]> =>
	await mapBackendTokens<CustomTokenErc1155Variant, Erc1155CustomToken>({
		...params,
		filterCustomToken: filterErc1155CustomToken,
		mapCustomToken: mapErc1155CustomToken,
		errorMsg: get(i18n).init.error.erc1155_custom_tokens
	});

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc1155CustomToken[];
}) => {
	erc1155CustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
