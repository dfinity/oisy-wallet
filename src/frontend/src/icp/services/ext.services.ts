import type { CustomToken, ExtV2Token } from '$declarations/backend/backend.did';
import { EXT_BUILTIN_TOKENS_INDEXED } from '$env/tokens/tokens-ext/tokens.ext.env';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import type { ExtCustomToken } from '$icp/types/ext-custom-token';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import { mapTokenSection } from '$lib/utils/custom-token-section.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { fromNullable, isNullish, nonNullish, queryAndUpdate } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadCustomTokens = ({
	identity,
	useCache = false
}: Omit<LoadCustomTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<ExtCustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError: ({ error: err }) => {
			extCustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.ext_custom_tokens },
				err
			});
		},
		identity
	});

const loadExtCustomTokens = async (params: LoadCustomTokenParams): Promise<CustomToken[]> =>
	await loadNetworkCustomTokens({
		...params,
		filterTokens: ({ token }) => 'ExtV2' in token
	});

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<ExtCustomToken[]> => {
	const extCustomTokens: CustomToken[] = await loadExtCustomTokens(params);

	const customTokenPromises = extCustomTokens
		.filter(
			(customToken): customToken is CustomToken & { token: { ExtV2: ExtV2Token } } =>
				'ExtV2' in customToken.token
		)
		.map(
			async ({
				token,
				enabled,
				version: versionNullable,
				section: sectionNullable,
				allow_external_content_source: allowExternalContentSourceNullable
			}) => {
				const version = fromNullable(versionNullable);
				const section = fromNullable(sectionNullable);
				const mappedSection = nonNullish(section) ? mapTokenSection(section) : undefined;
				const allowExternalContentSource = fromNullable(allowExternalContentSourceNullable);

				const {
					ExtV2: { canister_id: canisterId }
				} = token;

				const canisterIdText = canisterId.toString();

				// TODO: add the canister method to fetch metadata from the canister.
				const metadata = EXT_BUILTIN_TOKENS_INDEXED.get(canisterIdText);

				if (isNullish(metadata)) {
					return;
				}

				const { symbol, ...rest } = metadata;

				return {
					...rest,
					id: parseTokenId(symbol),
					canisterId: canisterIdText,
					symbol,
					standard: 'extV2' as const,
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

	return customTokens.reduce<ExtCustomToken[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		if (result.status === 'rejected' && params.certified) {
			toastsError({
				msg: { text: get(i18n).init.error.ext_custom_tokens },
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
	response: ExtCustomToken[];
}) => {
	extCustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};
