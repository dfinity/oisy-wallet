import type {
	CustomToken,
	// The backend declarations are not exporting IcPunksToken because it is structurally identical to ExtV2Token
	ExtV2Token as IcPunksToken
} from '$declarations/backend/backend.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	IC_PUNKS_BUILTIN_TOKENS,
	IC_PUNKS_BUILTIN_TOKENS_INDEXED
} from '$env/tokens/tokens-icpunks/tokens.icpunks.env';
import { collectionMetadata } from '$icp/api/icpunks.api';
import { icPunksCustomTokensStore } from '$icp/stores/icpunks-custom-tokens.store';
import { icPunksDefaultTokensStore } from '$icp/stores/icpunks-default-tokens.store';
import type { IcPunksCustomToken } from '$icp/types/icpunks-custom-token';
import { mapBackendTokens } from '$lib/services/load-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
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

export const loadIcPunksTokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<void> => {
	await Promise.all([loadDefaultIcPunksTokens(), loadCustomTokens({ identity, useCache: true })]);
};

const loadDefaultIcPunksTokens = (): ResultSuccess => {
	icPunksDefaultTokensStore.set(
		IC_PUNKS_BUILTIN_TOKENS.map((token) => ({ ...token, id: parseTokenId(token.symbol) }))
	);

	return { success: true };
};

export const loadCustomTokens = ({
	identity,
	useCache = false
}: Omit<LoadCustomTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<IcPunksCustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError: ({ error: err }) => {
			icPunksCustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.icpunks_custom_tokens },
				err
			});
		},
		identity
	});

type CustomTokenIcPunksVariant = Omit<CustomToken, 'token'> & { token: { IcPunks: IcPunksToken } };

const filterIcPunksCustomToken = (
	customToken: CustomToken
): customToken is CustomTokenIcPunksVariant => 'IcPunks' in customToken.token;

const mapIcPunksCustomToken = async ({
	token,
	enabled,
	version: versionNullable,
	section: sectionNullable,
	allow_external_content_source: allowExternalContentSourceNullable,
	identity,
	certified
}: CustomTokenIcPunksVariant & QueryAndUpdateRequestParams): Promise<
	IcPunksCustomToken | undefined
> => {
	const version = fromNullable(versionNullable);
	const section = fromNullable(sectionNullable);
	const mappedSection = nonNullish(section) ? mapTokenSection(section) : undefined;
	const allowExternalContentSource = fromNullable(allowExternalContentSourceNullable);

	const {
		IcPunks: { canister_id: rawCanisterId }
	} = token;

	const canisterId = rawCanisterId.toString();

	const { symbol, ...rest } =
		IC_PUNKS_BUILTIN_TOKENS_INDEXED.get(canisterId) ??
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
		standard: { code: 'icpunks' as const },
		category: 'custom' as const,
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
): Promise<IcPunksCustomToken[]> =>
	await mapBackendTokens<CustomTokenIcPunksVariant, IcPunksCustomToken>({
		...params,
		filterCustomToken: filterIcPunksCustomToken,
		mapCustomToken: mapIcPunksCustomToken,
		errorMsg: get(i18n).init.error.icpunks_custom_tokens
	});

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: IcPunksCustomToken[];
}) => {
	icPunksCustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
