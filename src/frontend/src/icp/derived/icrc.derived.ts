import {
	ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS,
	ICRC_CK_TOKENS_LEDGER_CANISTER_IDS
} from '$env/networks/networks.icrc.env';
import { buildDip20Tokens } from '$icp/services/dip20-tokens.services';
import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { icrcDefaultTokensStore } from '$icp/stores/icrc-default-tokens.store';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { CanisterIdText } from '$lib/types/canister';
import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of Icrc default tokens - i.e. the statically configured Icrc tokens of Oisy + their metadata, unique ids etc. fetched at runtime.
 */
const icrcDefaultTokens: Readable<IcToken[]> = derived(
	[icrcDefaultTokensStore, testnetsEnabled],
	([$icrcTokensStore, $testnetsEnabled]) =>
		($icrcTokensStore?.map(({ data: token }) => token) ?? []).filter(
			(token) => $testnetsEnabled || !isTokenIcrcTestnet(token)
		)
);

/**
 * The list of Icrc tokens that are default for Chain Fusion, in the order provided by the static list.
 */
export const icrcChainFusionDefaultTokens: Readable<IcToken[]> = derived(
	[icrcDefaultTokens],
	([$icrcDefaultTokens]) =>
		ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.map((canisterId) =>
			$icrcDefaultTokens.find(
				({ ledgerCanisterId: tokenCanisterId }) => tokenCanisterId === canisterId
			)
		).filter(nonNullish)
);

/**
 * A flatten list of the default ICRC Ledger canister Id.
 */
const icrcDefaultTokensCanisterIds: Readable<CanisterIdText[]> = derived(
	[icrcDefaultTokens],
	([$icrcDefaultTokens]) => $icrcDefaultTokens.map(({ ledgerCanisterId }) => ledgerCanisterId)
);

/**
 * The list of Icrc tokens the user has added, enabled or disabled. Can contains default tokens for example if user has disabled a default tokens.
 * i.e. default tokens are configured on the client side. If user disable or enable a default tokens, this token is added as a "custom token" in the backend.
 */
const icrcCustomTokens: Readable<IcrcCustomToken[]> = derived(
	[icrcCustomTokensStore, testnetsEnabled],
	([$icrcCustomTokensStore, $testnetsEnabled]) =>
		($icrcCustomTokensStore?.map(({ data: token }) => token) ?? []).filter(
			(token) => $testnetsEnabled || !isTokenIcrcTestnet(token)
		)
);

const icrcDefaultTokensToggleable: Readable<IcTokenToggleable[]> = derived(
	[icrcDefaultTokens, icrcCustomTokens],
	([$icrcDefaultTokens, $icrcUserTokens]) =>
		$icrcDefaultTokens.map(({ ledgerCanisterId, ...rest }) => {
			const userToken = $icrcUserTokens.find(
				({ ledgerCanisterId: userLedgerCanisterId }) => userLedgerCanisterId === ledgerCanisterId
			);

			return mapDefaultTokenToToggleable<IcToken>({
				defaultToken: { ledgerCanisterId, ...rest },
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
			({ ledgerCanisterId }) => !$icrcDefaultTokensCanisterIds.includes(ledgerCanisterId)
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

const enabledIcrcTokensNoCk: Readable<IcToken[]> = derived(
	[enabledIcrcTokens],
	([$enabledIcrcTokens]) =>
		$enabledIcrcTokens.filter(
			({ ledgerCanisterId }) => !ICRC_CK_TOKENS_LEDGER_CANISTER_IDS.includes(ledgerCanisterId)
		)
);

export const enabledIcrcLedgerCanisterIdsNoCk: Readable<LedgerCanisterIdText[]> = derived(
	[enabledIcrcTokensNoCk],
	([$enabledIcrcTokensNoCk]) => [
		...new Map(
			$enabledIcrcTokensNoCk.map(({ ledgerCanisterId, indexCanisterId }) => [
				`${ledgerCanisterId}|${indexCanisterId}`,
				ledgerCanisterId
			])
		).values()
	]
);

/**
 * The list of all known to OISY ICRC token ledger ids.
 * It is used to determine whether a token can be deleted or not.
 */
export const allKnownIcrcTokensLedgerCanisterIds: Readable<LedgerCanisterIdText[]> = derived(
	[icrcDefaultTokens],
	([$icrcDefaultTokens]) => {
		const tokens = [...buildIcrcCustomTokens(), ...buildDip20Tokens()];
		const icrcEnvTokens: IcTokenToggleable[] =
			tokens?.map((token) => ({ ...token, id: parseTokenId(token.symbol), enabled: false })) ?? [];

		return [
			...$icrcDefaultTokens.map(({ ledgerCanisterId }) => ledgerCanisterId),
			...icrcEnvTokens.map(({ ledgerCanisterId }) => ledgerCanisterId)
		];
	}
);
