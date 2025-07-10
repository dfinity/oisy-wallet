import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { enabledIcrcTokens, icrcTokens } from '$icp/derived/icrc.derived';
import { buildDip20Tokens } from '$icp/services/dip20-tokens.services';
import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { splTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
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
		const tokens = [...buildIcrcCustomTokens(), ...buildDip20Tokens()];
		const icrcEnvTokens: IcTokenToggleable[] =
			tokens?.map((token) => ({ ...token, id: parseTokenId(token.symbol), enabled: false })) ?? [];

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

export const allTokens = derived(
	[
		// The entire list of Erc20 tokens to display to the user.
		erc20Tokens,
		enabledBitcoinTokens,
		enabledEthereumTokens,
		allIcrcTokens,
		enabledSolanaTokens,
		splTokens,
		enabledEvmTokens
	],
	([
		$erc20Tokens,
		$enabledBitcoinTokens,
		$enabledEthereumTokens,
		$allIcrcTokens,
		$enabledSolanaTokens,
		$splTokens,
		$enabledEvmTokens
	]) => [
		{
			...ICP_TOKEN,
			enabled: true
		},
		...$enabledBitcoinTokens.map((token) => ({ ...token, enabled: true })),
		...$enabledEthereumTokens.map((token) => ({ ...token, enabled: true })),
		...$enabledSolanaTokens.map((token) => ({ ...token, enabled: true })),
		...$enabledEvmTokens.map((token) => ({ ...token, enabled: true })),
		...$erc20Tokens,
		...$allIcrcTokens,
		...$splTokens
	]
);
