import type { Languages } from '$lib/enums/languages';
import type { TokenCategoryTagValue } from '$lib/enums/token-tag';
import type { Network } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getTokenCategorySentenceLabel } from '$lib/utils/token-tag.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

/**
 * Names what a token list's filters left out, e.g. "No stocks on Bitcoin", so an empty list
 * says why it is empty. Each filter that is unset is left out of the sentence.
 */
export const getNoTokensMatchMessage = ({
	i18n,
	language,
	query,
	network,
	category
}: {
	i18n: I18n;
	language: Languages;
	query?: string;
	network?: Network;
	category?: TokenCategoryTagValue;
}): string => {
	const trimmedQuery = query?.trim() ?? '';
	const hasQuery = notEmptyString(trimmedQuery);
	const hasNetwork = nonNullish(network);
	const hasCategory = nonNullish(category);

	const {
		tokens: { text }
	} = i18n;

	const template = hasQuery
		? hasCategory
			? hasNetwork
				? text.no_match_query_asset_type_network
				: text.no_match_query_asset_type
			: hasNetwork
				? text.no_match_query_network
				: text.no_match_query
		: hasCategory
			? hasNetwork
				? text.no_match_asset_type_network
				: text.no_match_asset_type
			: hasNetwork
				? text.no_match_network
				: undefined;

	if (isNullish(template)) {
		return i18n.core.text.no_results;
	}

	return replacePlaceholders(template, {
		$query: trimmedQuery,
		$network: network?.name ?? '',
		$asset_type: hasCategory ? getTokenCategorySentenceLabel({ category, i18n, language }) : ''
	});
};
