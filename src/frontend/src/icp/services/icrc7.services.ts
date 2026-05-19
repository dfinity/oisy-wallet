import type {
	CustomToken,
	// The backend declarations are not exporting Icrc7Token because it is structurally identical to ExtV2Token
	ExtV2Token as Icrc7Token
} from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	ICRC7_BUILTIN_TOKENS,
	ICRC7_BUILTIN_TOKENS_INDEXED
} from '$env/tokens/tokens-icrc7/tokens.icrc7.env';
import { collectionMetadata } from '$icp/api/icrc7.api';
import { icrc7CustomTokensStore } from '$icp/stores/icrc7-custom-tokens.store';
import { icrc7DefaultTokensStore } from '$icp/stores/icrc7-default-tokens.store';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import { mapBackendTokens } from '$lib/services/load-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { NullishIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { mapTokenSection } from '$lib/utils/custom-token-section.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	fromNullable,
	nonNullish,
	queryAndUpdate,
	type QueryAndUpdateRequestParams
} from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadIcrc7Tokens = async ({
	identity
}: {
	identity: NullishIdentity;
}): Promise<void> => {
	await Promise.all([loadDefaultIcrc7Tokens(), loadCustomTokens({ identity, useCache: true })]);
};

export const loadDefaultIcrc7Tokens = (): ResultSuccess => {
	icrc7DefaultTokensStore.set(
		ICRC7_BUILTIN_TOKENS.map((token) => ({ ...token, id: parseTokenId(token.symbol) }))
	);

	return { success: true };
};

export const loadCustomTokens = ({
	identity,
	useCache = false
}: Omit<LoadCustomTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<Icrc7CustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError,
		identity
	});

type CustomTokenIcrc7Variant = Omit<CustomToken, 'token'> & { token: { Icrc7: Icrc7Token } };

const filterIcrc7CustomToken = (customToken: CustomToken): customToken is CustomTokenIcrc7Variant =>
	'Icrc7' in customToken.token;

const mapIcrc7CustomToken = async ({
	token: {
		token,
		enabled,
		version: versionNullable,
		section: sectionNullable,
		allow_external_content_source: allowExternalContentSourceNullable
	},
	identity,
	certified
}: { token: CustomTokenIcrc7Variant } & QueryAndUpdateRequestParams): Promise<
	Icrc7CustomToken | undefined
> => {
	const version = fromNullable(versionNullable);
	const section = fromNullable(sectionNullable);
	const mappedSection = nonNullish(section) ? mapTokenSection(section) : undefined;
	const allowExternalContentSource = fromNullable(allowExternalContentSourceNullable);

	const {
		Icrc7: { canister_id: rawCanisterId }
	} = token;

	const canisterId = rawCanisterId.toString();

	const { symbol, ...rest } =
		ICRC7_BUILTIN_TOKENS_INDEXED.get(canisterId) ??
		(await collectionMetadata({
			canisterId,
			certified,
			identity
		}));

	return {
		decimals: 0,
		network: ICP_NETWORK,
		...rest,
		id: parseTokenId(symbol),
		canisterId,
		symbol,
		standard: { code: 'icrc7' as const },
		category: 'custom' as const,
		tags: DEFAULT_TOKEN_TAGS,
		enabled,
		version,
		...(nonNullish(mappedSection) && {
			section: mappedSection
		}),
		allowExternalContentSource
	};
};

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<Icrc7CustomToken[]> =>
	await mapBackendTokens<CustomTokenIcrc7Variant, Icrc7CustomToken>({
		...params,
		filterCustomToken: filterIcrc7CustomToken,
		mapCustomToken: mapIcrc7CustomToken,
		errorMsg: get(i18n).init.error.icrc7_custom_tokens
	});

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Icrc7CustomToken[];
}) => {
	icrc7CustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};

const onUpdateError = ({ error: err }: { error: unknown }) => {
	icrc7CustomTokensStore.resetAll();

	toastsError({
		msg: { text: get(i18n).init.error.icrc7_custom_tokens },
		err
	});
};

export const processCustomTokens = async (params: LoadCustomTokenParams): Promise<void> => {
	try {
		const response = await loadCustomTokensWithMetadata(params);

		loadCustomTokenData({ response, certified: params.certified });
	} catch (err) {
		if (params.certified) {
			onUpdateError({ error: err });
		}
	}
};
