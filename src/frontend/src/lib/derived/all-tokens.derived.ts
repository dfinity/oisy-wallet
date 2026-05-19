import { KONGSWAP_PROVIDER_ENABLED } from '$env/rest/kongswap.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { IC_BUILTIN_TOKENS } from '$env/tokens/tokens.ic.env';
import { ercFungibleTokens } from '$eth/derived/erc-fungible.derived';
import { enabledEthEvmNativeTokens } from '$eth/derived/native-tokens.derived';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { icrcTokens } from '$icp/derived/icrc.derived';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { nativeTokens, nonFungibleTokens } from '$lib/derived/tokens.derived';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { CustomToken } from '$lib/types/custom-token';
import type { RequiredToken, Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { derivedMemo } from '$lib/utils/derived-memo.utils';
import { isTokenFungible } from '$lib/utils/nft.utils';
import { tokenListEqual } from '$lib/utils/tokens.utils';
import { splTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

// The entire list of ICRC tokens to display to the user:
// This includes the default tokens (disabled or enabled), the custom tokens (disabled or enabled),
// and the environment tokens that have never been used.
export const allIcrcTokens: Readable<IcTokenToggleable[]> = derivedMemo(
	[icrcTokens],
	([$icrcTokens]) => {
		// The list of ICRC tokens (SNSes) is defined as environment variables.
		// These tokens are not necessarily loaded at boot time if the user has not added them to their list of custom tokens.
		const icrcEnvTokens: IcTokenToggleable[] =
			IC_BUILTIN_TOKENS.map((token) => ({ ...token, enabled: false })) ?? [];

		// All the Icrc ledger ids including the default tokens and the user custom tokens regardless if enabled or disabled.
		const knownLedgerCanisterIds = new Set(
			$icrcTokens.map(({ ledgerCanisterId }) => ledgerCanisterId)
		);

		return [
			...$icrcTokens,
			...icrcEnvTokens.filter(
				({ ledgerCanisterId }) => !knownLedgerCanisterIds.has(ledgerCanisterId)
			)
		];
	},
	tokenListEqual
);

export const allSortedIcrcTokens: Readable<IcTokenToggleable[]> = derived(
	[allIcrcTokens],
	([$allIcrcTokens]) => [...$allIcrcTokens].sort(sortIcTokens)
);

export const allSwapCompatibleIcrcTokens: Readable<IcTokenToggleable[]> = derived(
	[allIcrcTokens, kongSwapTokensStore],
	([$allIcrcTokens, $kongSwapTokensStore]) =>
		$allIcrcTokens.filter(
			({ symbol }) => !KONGSWAP_PROVIDER_ENABLED || nonNullish($kongSwapTokensStore?.[symbol])
		)
);

export const allTokens: Readable<CustomToken<Token>[]> = derivedMemo(
	[nativeTokens, ercFungibleTokens, allIcrcTokens, splTokens, nonFungibleTokens],
	([$nativeTokens, $ercFungibleTokens, $allIcrcTokens, $splTokens, $nonFungibleTokens]) => [
		...$nativeTokens.map((token) => ({ ...token, enabled: true })),
		...$ercFungibleTokens,
		...$allIcrcTokens,
		...$splTokens,
		...$nonFungibleTokens
	],
	tokenListEqual
);

export const allFungibleTokens: Readable<Token[]> = derivedMemo(
	[allTokens],
	([$tokens]) => $tokens.filter(isTokenFungible),
	tokenListEqual
);

export const allCrossChainSwapTokens: Readable<
	TokenToggleable<RequiredToken | Erc20CustomToken | Erc4626CustomToken | SplCustomToken>[]
> = derived(
	[ercFungibleTokens, enabledEthEvmNativeTokens, splTokens, enabledSolanaTokens],
	([$ercFungibleTokens, $ethEvmNativeTokens, $splTokens, $enabledSolanaTokens]) => [
		...$ethEvmNativeTokens.map((token) => ({ ...token, enabled: true })),
		...$ercFungibleTokens,
		...(NEAR_INTENTS_SWAP_ENABLED
			? [...$enabledSolanaTokens.map((token) => ({ ...token, enabled: true })), ...$splTokens]
			: [])
	]
);
