import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import { extDefaultTokensStore } from '$icp/stores/ext-default-tokens.store';
import type { ExtCustomToken } from '$icp/types/ext-custom-token';
import type { ExtToken } from '$icp/types/ext-token';
import type { CanisterIdText } from '$lib/types/canister';
import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

const extDefaultTokens: Readable<ExtToken[]> = derived(
	[extDefaultTokensStore],
	([$extTokensStore]) => $extTokensStore ?? []
);

const extDefaultTokensCanisterIds: Readable<CanisterIdText[]> = derived(
	[extDefaultTokens],
	([$extDefaultTokens]) => $extDefaultTokens.map(({ canisterId }) => canisterId)
);

/**
 * The list of EXT custom tokens the user has added, enabled, or disabled.
 */
export const extCustomTokens: Readable<ExtCustomToken[]> = derived(
	[extCustomTokensStore],
	([$extCustomTokensStore]) => $extCustomTokensStore?.map(({ data: token }) => token) ?? []
);

const extDefaultTokensToggleable: Readable<ExtCustomToken[]> = derived(
	[extDefaultTokens, extCustomTokens],
	([$extDefaultTokens, $extCustomTokens]) =>
		$extDefaultTokens.map(({ canisterId, ...rest }) => {
			const customToken = $extCustomTokens.find(
				({ canisterId: canisterIdCustomToken }) => canisterIdCustomToken === canisterId
			);

			return mapDefaultTokenToToggleable<ExtToken>({
				defaultToken: { canisterId, ...rest },
				customToken
			});
		})
);

const extCustomTokensToggleable: Readable<ExtCustomToken[]> = derived(
	[extCustomTokens, extDefaultTokensCanisterIds],
	([$extCustomTokens, $extDefaultTokensCanisterIds]) =>
		$extCustomTokens.filter(({ canisterId }) => !$extDefaultTokensCanisterIds.includes(canisterId))
);

/**
 * The list of all EXT tokens.
 */
export const extTokens: Readable<ExtCustomToken[]> = derived(
	[extDefaultTokensToggleable, extCustomTokensToggleable],
	([$extDefaultTokensToggleable, $extCustomTokensToggleable]) => [
		...$extDefaultTokensToggleable,
		...$extCustomTokensToggleable
	]
);

/**
 * The list of all enabled EXT tokens.
 */
export const enabledExtTokens: Readable<ExtCustomToken[]> = derived([extTokens], ([$extTokens]) =>
	$extTokens.filter(({ enabled }) => enabled)
);

export const extCustomTokensInitialized: Readable<boolean> = derived(
	[extCustomTokensStore],
	([$extCustomTokensStore]) => $extCustomTokensStore !== undefined
);

export const extCustomTokensNotInitialized: Readable<boolean> = derived(
	[extCustomTokensInitialized],
	([$extCustomTokensInitialized]) => !$extCustomTokensInitialized
);
