import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { IcToken } from '$icp/types/ic';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { testnets } from '$lib/derived/testnets.derived';
import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of Icrc default tokens - i.e. the statically configured Icrc tokens of Oisy + their metadata, unique ids etc. fetched at runtime.
 */
const icrcDefaultTokens: Readable<IcToken[]> = derived(
	[icrcDefaultTokensStore, testnets],
	([$icrcTokensStore, $testnets]) =>
		($icrcTokensStore?.map(({ data: token }) => token) ?? []).filter(
			(token) => $testnets || !isTokenIcrcTestnet(token)
		)
);

/**
 * A flatten list of the default Icrc Ledger and Index canister Ids.
 */
const icrcDefaultTokensCanisterIds: Readable<string[]> = derived(
	[icrcDefaultTokens],
	([$icrcDefaultTokens]) =>
		$icrcDefaultTokens.map(
			({ ledgerCanisterId, indexCanisterId }) => `${ledgerCanisterId}:${indexCanisterId}`
		)
);

/**
 * The list of Icrc tokens the user has added, enabled or disabled. Can contains default tokens for example if user has disabled a default tokens.
 * i.e. default tokens are configured on the client side. If user disable or enable a default tokens, this token is added as a "custom token" in the backend.
 */
const icrcCustomTokens: Readable<IcrcCustomToken[]> = derived(
	[icrcCustomTokensStore, testnets],
	([$icrcCustomTokensStore, $testnets]) =>
		($icrcCustomTokensStore?.map(({ data: token }) => token) ?? []).filter(
			(token) => $testnets || !isTokenIcrcTestnet(token)
		)
);

const icrcDefaultTokensToggleable: Readable<IcTokenToggleable[]> = derived(
	[icrcDefaultTokens, icrcCustomTokens],
	([$icrcDefaultTokens, $icrcUserTokens]) =>
		$icrcDefaultTokens.map(({ ledgerCanisterId, indexCanisterId, ...rest }) => {
			const userToken = $icrcUserTokens.find(
				({ ledgerCanisterId: userLedgerCanisterId, indexCanisterId: userIndexCanisterId }) =>
					userLedgerCanisterId === ledgerCanisterId && userIndexCanisterId === indexCanisterId
			);

			return mapDefaultTokenToToggleable({
				defaultToken: {
					ledgerCanisterId,
					indexCanisterId,
					...rest
				},
				userToken
			});
		})
);

/**
 * The list of default tokens that are enabled - i.e. the list of default Icrc tokens minus those disabled by the user.
 */
const enabledIcrcDefaultTokens: Readable<IcToken[]> = derived(
	[icrcDefaultTokensToggleable],
	([$icrcDefaultTokensToggleable]) => $icrcDefaultTokensToggleable.filter(({ enabled }) => enabled)
);

/**
 * The list of Icrc tokens enabled by the user - i.e. saved in the backend canister as enabled - minus those that duplicate default tokens.
 * We do so because the default statically configured are those to be used for various feature. This is notably useful for ERC20 <> ckERC20 conversion given that tokens on both sides (ETH an IC) should know about each others ("Twin Token" links).
 */
const icrcCustomTokensToggleable: Readable<IcrcCustomToken[]> = derived(
	[icrcCustomTokens, icrcDefaultTokensCanisterIds],
	([$icrcCustomTokens, $icrcDefaultTokensCanisterIds]) =>
		$icrcCustomTokens.filter(
			({ ledgerCanisterId, indexCanisterId }) =>
				!$icrcDefaultTokensCanisterIds.includes(`${ledgerCanisterId}:${indexCanisterId}`)
		)
);

const enabledIcrcCustomTokens: Readable<IcrcCustomToken[]> = derived(
	[icrcCustomTokens],
	([$icrcCustomTokens]) => $icrcCustomTokens.filter(({ enabled }) => enabled)
);

/**
 * The list of all Icrc tokens.
 */
export const icrcTokens: Readable<IcrcCustomToken[]> = derived(
	[icrcDefaultTokensToggleable, icrcCustomTokensToggleable],
	([$icrcDefaultTokensToggleable, $icrcCustomTokensToggleable]) => [
		...$icrcDefaultTokensToggleable,
		...$icrcCustomTokensToggleable
	]
);

export const sortedIcrcTokens: Readable<IcrcCustomToken[]> = derived(
	[icrcTokens],
	([$icrcTokens]) => $icrcTokens.sort(sortIcTokens)
);

/**
 * The list of Icrc tokens that are either enabled by default (static config) or enabled by the users regardless if they are custom or default.
 */
export const enabledIcrcTokens: Readable<IcToken[]> = derived(
	[enabledIcrcDefaultTokens, enabledIcrcCustomTokens],
	([$enabledIcrcDefaultTokens, $enabledIcrcCustomTokens]) => [
		...$enabledIcrcDefaultTokens,
		...$enabledIcrcCustomTokens
	]
);
