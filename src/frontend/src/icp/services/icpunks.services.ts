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
import { icPunksCustomTokensStore } from '$icp/stores/icpunks-custom-tokens.store';
import { icPunksDefaultTokensStore } from '$icp/stores/icpunks-default-tokens.store';
import type { IcPunksCustomToken } from '$icp/types/icpunks-custom-token';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { mapTokenSection } from '$lib/utils/custom-token-section.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { fromNullable, nonNullish, queryAndUpdate } from '@dfinity/utils';
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

const loadIcPunksCustomTokens = async (params: LoadCustomTokenParams): Promise<CustomToken[]> =>
	await loadNetworkCustomTokens({
		...params,
		filterTokens: ({ token }) => 'IcPunks' in token
	});

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<IcPunksCustomToken[]> => {
	const icPunksCustomTokens: CustomToken[] = await loadIcPunksCustomTokens(params);

	const customTokenPromises = icPunksCustomTokens
		.filter(
			(customToken): customToken is CustomToken & { token: { IcPunks: IcPunksToken } } =>
				'IcPunks' in customToken.token
		)
		.map(
			async ({
				token,
				enabled,
				version: versionNullable,
				section: sectionNullable,
				allow_external_content_source: allowExternalContentSourceNullable
				// eslint-disable-next-line require-await -- We are going to add an async function to fetch the metadata
			}) => {
				const version = fromNullable(versionNullable);
				const section = fromNullable(sectionNullable);
				const mappedSection = nonNullish(section) ? mapTokenSection(section) : undefined;
				const allowExternalContentSource = fromNullable(allowExternalContentSourceNullable);

				const {
					IcPunks: { canister_id: canisterId }
				} = token;

				const canisterIdText = canisterId.toString();

				// TODO: add the canister method to fetch metadata from the canister.
				const metadata = IC_PUNKS_BUILTIN_TOKENS_INDEXED.get(canisterIdText);

				const { symbol, ...rest } = metadata ?? {
					symbol: canisterIdText,
					name: canisterIdText,
					decimals: 0,
					network: ICP_NETWORK
				};

				return {
					...rest,
					id: parseTokenId(symbol),
					canisterId: canisterIdText,
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
			}
		);

	const customTokens = await Promise.allSettled(customTokenPromises);

	return customTokens.reduce<IcPunksCustomToken[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		if (result.status === 'rejected' && params.certified) {
			toastsError({
				msg: { text: get(i18n).init.error.icpunks_custom_tokens },
				err: result.reason
			});
		}

		return acc;
	}, []);
};

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: IcPunksCustomToken[];
}) => {
	icPunksCustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
