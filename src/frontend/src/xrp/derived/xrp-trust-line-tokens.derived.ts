import { XRP_TRUST_LINE_TOKENS_ENABLED } from '$env/xrp-trust-line-tokens.env';
import type { TokenId } from '$lib/types/token';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import { xrpCustomTokensStore } from '$xrp/stores/xrp-custom-tokens.store';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';
import { xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const xrpSavedTrustLineTokens: Readable<Map<TokenId, XrpTrustLineCustomToken>> = derived(
	[xrpCustomTokensStore],
	([$xrpCustomTokensStore]) =>
		new Map(($xrpCustomTokensStore?.tokens ?? []).map((token) => [token.id, token]))
);

/**
 * The trust-line tokens the user's XRP accounts hold, shown or hidden: one per line the ledger
 * reports, so a token appears once its line exists and never while it does not. Whether it is shown
 * is its backend entry's say; a line without one is shown, since the user added the token.
 */
export const xrpTrustLineTokens: Readable<XrpTrustLineCustomToken[]> = derived(
	[enabledXrpTokens, xrpTrustLinesStore, xrpSavedTrustLineTokens],
	([$enabledXrpTokens, $xrpTrustLinesStore, $xrpSavedTrustLineTokens]) =>
		XRP_TRUST_LINE_TOKENS_ENABLED
			? $enabledXrpTokens.flatMap(({ id, network }) =>
					($xrpTrustLinesStore[id] ?? []).map((line) => {
						const token = toXrpTrustLineToken({ identity: line, network });
						const saved = $xrpSavedTrustLineTokens.get(token.id);

						return nonNullish(saved)
							? {
									...token,
									enabled: saved.enabled,
									...(nonNullish(saved.version) && { version: saved.version })
								}
							: token;
					})
				)
			: []
);

export const enabledXrpTrustLineTokens: Readable<XrpTrustLineCustomToken[]> = derived(
	[xrpTrustLineTokens],
	([$xrpTrustLineTokens]) => $xrpTrustLineTokens.filter(({ enabled }) => enabled)
);

/**
 * The held trust-line tokens the backend has no entry for, once its list is certified: before that,
 * a missing entry may only be missing from the query's answer.
 */
export const xrpUnsavedTrustLineTokens: Readable<XrpTrustLineCustomToken[]> = derived(
	[xrpTrustLineTokens, xrpCustomTokensStore, xrpSavedTrustLineTokens],
	([$xrpTrustLineTokens, $xrpCustomTokensStore, $xrpSavedTrustLineTokens]) =>
		isNullish($xrpCustomTokensStore) || !$xrpCustomTokensStore.certified
			? []
			: $xrpTrustLineTokens.filter(({ id }) => !$xrpSavedTrustLineTokens.has(id))
);

/**
 * The keys the shown trust-line tokens are priced under: `<currency>.<issuer>`, the form CoinGecko's
 * `xrp` platform uses. One per token, even when two accounts hold it.
 */
export const xrpTrustLineTokenKeys: Readable<string[]> = derived(
	[enabledXrpTrustLineTokens],
	([$enabledXrpTrustLineTokens]) => [
		...new Set($enabledXrpTrustLineTokens.map(xrpTrustLineIdentifier))
	]
);
