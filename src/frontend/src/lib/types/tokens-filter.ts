import type { TokenCategoryTagValue } from '$lib/enums/token-tag';

/**
 * Generic shape for a single-select tag filter.
 * Each tag type (category, risk, …) gets its own alias
 * and its own store; the stores are independent filter facets.
 */
interface TokenTagFilterData<T> {
	value: T | undefined;
}

export type TokenCategoryFilterData = TokenTagFilterData<TokenCategoryTagValue>;
