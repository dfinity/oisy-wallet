import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import { sortIcTokens } from '$icp/utils/icrc.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { splTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { derived } from 'svelte/store';

// The entire list of ICRC tokens to display to the user:
// This includes the default tokens (disabled or enabled), the custom tokens (disabled or enabled),
// and the environment tokens that have never been used.
const allIcrcTokens = derived([icrcTokens], ([$icrcTokens]) => {
	// The list of ICRC tokens (SNSes) is defined as environment variables.
	// These tokens are not necessarily loaded at boot time if the user has not added them to their list of custom tokens.
	const tokens = buildIcrcCustomTokens();
	const icrcEnvTokens =
		tokens?.map((token) => ({ ...token, id: parseTokenId(token.symbol), enabled: false })) ?? [];

	// All the Icrc ledger ids including the default tokens and the user custom tokens regardless if enabled or disabled.
	const knownLedgerCanisterIds = $icrcTokens.map(({ ledgerCanisterId }) => ledgerCanisterId);

	return [
		...$icrcTokens,
		...icrcEnvTokens.filter(
			({ ledgerCanisterId }) => !knownLedgerCanisterIds.includes(ledgerCanisterId)
		)
	].sort(sortIcTokens);
});

export const allTokens = derived(
	[
		// The entire list of Erc20 tokens to display to the user.
		erc20Tokens,
		enabledBitcoinTokens,
		enabledEthereumTokens,
		allIcrcTokens,
		enabledSolanaTokens,
		splTokens
	],
	([
		$erc20Tokens,
		$enabledBitcoinTokens,
		$enabledEthereumTokens,
		$allIcrcTokens,
		$enabledSolanaTokens,
		$splTokens
	]) => [
		{
			...ICP_TOKEN,
			enabled: true
		},
		...$enabledBitcoinTokens.map((token) => ({ ...token, enabled: true })),
		...$enabledEthereumTokens.map((token) => ({ ...token, enabled: true })),
		...$enabledSolanaTokens.map((token) => ({ ...token, enabled: true })),
		...$erc20Tokens,
		...$allIcrcTokens,
		...$splTokens
	]
);
