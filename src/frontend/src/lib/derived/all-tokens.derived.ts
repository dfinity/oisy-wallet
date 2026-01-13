import { IC_BUILTIN_TOKENS } from '$env/tokens/tokens.ic.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { enabledIcrcTokens, icrcTokens } from '$icp/derived/icrc.derived';
import type { IcTokenWithIcrc2Supported } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { nativeTokens, nonFungibleTokens } from '$lib/derived/tokens.derived';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import { swappableIcrcTokensStore } from '$lib/stores/swap-icrc-tokens.store';
import type { Token } from '$lib/types/token';
import { isTokenFungible } from '$lib/utils/nft.utils';
import { splTokens } from '$sol/derived/spl.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

// The entire list of ICRC tokens to display to the user:
// This includes the default tokens (disabled or enabled), the custom tokens (disabled or enabled),
// and the environment tokens that have never been used.
export const allIcrcTokens: Readable<IcTokenToggleable[]> = derived(
	[icrcTokens],
	([$icrcTokens]) => {
		// The list of ICRC tokens (SNSes) is defined as environment variables.
		// These tokens are not necessarily loaded at boot time if the user has not added them to their list of custom tokens.
		const icrcEnvTokens: IcTokenToggleable[] =
			IC_BUILTIN_TOKENS.map((token) => ({ ...token, enabled: false })) ?? [];

		// All the Icrc ledger ids including the default tokens and the user custom tokens regardless if enabled or disabled.
		const knownLedgerCanisterIds = $icrcTokens.map(({ ledgerCanisterId }) => ledgerCanisterId);

		return [
			...$icrcTokens,
			...icrcEnvTokens.filter(
				({ ledgerCanisterId }) => !knownLedgerCanisterIds.includes(ledgerCanisterId)
			)
		].sort(sortIcTokens);
	}
);

export const allKongSwapCompatibleIcrcTokens: Readable<IcTokenToggleable[]> = derived(
	[allIcrcTokens, kongSwapTokensStore],
	([$allIcrcTokens, $kongSwapTokensStore]) =>
		$allIcrcTokens.filter(({ symbol }) => nonNullish($kongSwapTokensStore?.[symbol]))
);

export const allDisabledKongSwapCompatibleIcrcTokens: Readable<IcTokenToggleable[]> = derived(
	[allKongSwapCompatibleIcrcTokens, enabledIcrcTokens],
	([allKongSwapCompatibleIcrcTokens, $enabledIcrcTokens]) => {
		const enabledIcrcTokenIds = $enabledIcrcTokens.map(({ id }) => id);

		return allKongSwapCompatibleIcrcTokens.filter(({ id }) => !enabledIcrcTokenIds.includes(id));
	}
);

export const allSwappableTokensDerived: Readable<IcTokenWithIcrc2Supported[]> = derived(
	[swappableIcrcTokensStore],
	([$swappableTokensStore]) => $swappableTokensStore ?? []
);

export const allTokens = derived(
	[nativeTokens, erc20Tokens, allIcrcTokens, splTokens, nonFungibleTokens],
	([$nativeTokens, $erc20Tokens, $allIcrcTokens, $splTokens, $nonFungibleTokens]) => [
		...$nativeTokens.map((token) => ({ ...token, enabled: true })),
		...$erc20Tokens,
		...$allIcrcTokens,
		...$splTokens,
		...$nonFungibleTokens
	]
);

export const allFungibleTokens: Readable<Token[]> = derived([allTokens], ([$tokens]) =>
	$tokens.filter(isTokenFungible)
);

export const allCrossChainSwapTokens = derived(
	[erc20Tokens, enabledEthereumTokens, enabledEvmTokens],
	([$erc20Tokens, $enabledEthereumTokens, $enabledEvmTokens]) => [
		...$enabledEthereumTokens.map((token) => ({ ...token, enabled: true })),
		...$enabledEvmTokens.map((token) => ({ ...token, enabled: true })),
		...$erc20Tokens.map((token) => ({ ...token, enabled: true }))
	]
);
