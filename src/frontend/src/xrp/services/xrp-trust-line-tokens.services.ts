import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import type { SaveCustomXrpTrustLineVariant } from '$lib/types/custom-token';
import type { NonEmptyArray } from '$lib/types/utils';
import { consoleWarn } from '$lib/utils/console.utils';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';
import type { Identity } from '@icp-sdk/core/agent';

// Each held line is saved at most once per session, whatever the outcome: a save that keeps failing
// must not be retried on every reload of the list it triggers.
const attemptedIdentifiers = new Set<string>();

/**
 * Saves held trust-line tokens the backend has no entry for, enabled, the way `LoaderCollections`
 * saves the NFTs it finds. The ledger only holds a line the user added — through a `TrustSet` whose
 * backend write then failed, say — so the token is theirs and belongs in their list.
 */
export const saveUnsavedXrpTrustLineTokens = async ({
	identity,
	tokens
}: {
	identity: Identity;
	tokens: XrpTrustLineCustomToken[];
}): Promise<void> => {
	const unsaved = tokens.filter(
		(token) => !attemptedIdentifiers.has(xrpTrustLineIdentifier(token))
	);

	if (unsaved.length === 0) {
		return;
	}

	unsaved.forEach((token) => attemptedIdentifiers.add(xrpTrustLineIdentifier(token)));

	try {
		await saveCustomTokens({
			identity,
			tokens: unsaved.map(({ currency, issuer }) => ({
				currency,
				issuer,
				networkKey: 'XrpTrustLineMainnet',
				enabled: true
			})) as NonEmptyArray<SaveCustomXrpTrustLineVariant>
		});
	} catch (err: unknown) {
		// Not the user's action, so no toast: the token is shown either way, and the next session tries
		// again.
		consoleWarn('Could not save the XRP Ledger tokens held on the ledger:', err);
	}
};
