import { XRP_TRUST_LINE_TOKENS_ENABLED } from '$env/xrp-trust-line-tokens.env';
import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The trust-line tokens the user's XRP accounts hold: one per line the ledger reports, so a token
 * appears once its line exists and never while it does not.
 */
export const xrpTrustLineTokens: Readable<XrpTrustLineCustomToken[]> = derived(
	[enabledXrpTokens, xrpTrustLinesStore],
	([$enabledXrpTokens, $xrpTrustLinesStore]) =>
		XRP_TRUST_LINE_TOKENS_ENABLED
			? $enabledXrpTokens.flatMap(({ id, network }) =>
					($xrpTrustLinesStore[id] ?? []).map((line) => toXrpTrustLineToken({ line, network }))
				)
			: []
);
