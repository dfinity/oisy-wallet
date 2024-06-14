import { ICP_TOKEN } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { sortedIcrcTokens } from '$icp/derived/icrc.derived';
import { buildIcrcCustomTokens } from '$icp/services/icrc-custom-tokens.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import type { ManageableToken, Token } from '$lib/types/token';
import { mergeTokenLists } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

export const tokens: Readable<Token[]> = derived(
	[erc20Tokens, sortedIcrcTokens, enabledEthereumTokens],
	([$erc20Tokens, $icrcTokens, $enabledEthereumTokens]) => [
		ICP_TOKEN,
		...$enabledEthereumTokens,
		...$icrcTokens,
		...$erc20Tokens
	]
);

export const manageableTokens: Readable<ManageableToken[]> = derived([tokens], ([$tokens]) => {
	const allIcrcCustomTokens: IcrcCustomToken[] = buildIcrcCustomTokens()
		.map((token) => ({
			...token,
			id: Symbol(token.symbol),
			enabled: false
		}))
		.filter((token) => token.indexCanisterVersion !== 'outdated');
	return mergeTokenLists<ManageableToken>(
		$tokens.map((token) => ({ ...token, enabled: true })),
		allIcrcCustomTokens
	);
});
