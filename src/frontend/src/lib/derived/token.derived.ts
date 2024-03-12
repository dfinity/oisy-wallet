import { erc20Tokens } from '$eth/derived/erc20.derived';
import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$icp-eth/constants/tokens.constants';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { routeToken } from '$lib/derived/nav.derived';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const token: Readable<Token> = derived(
	[routeToken, erc20Tokens, icrcTokens],
	([$routeToken, $erc20Tokens, $icrcTokens]) => {
		if (isNullish($routeToken)) {
			return DEFAULT_ETHEREUM_TOKEN;
		}

		if ($routeToken === ICP_TOKEN.name) {
			return ICP_TOKEN;
		}

		return (
			[...$erc20Tokens, ...$icrcTokens, ETHEREUM_TOKEN, SEPOLIA_TOKEN].find(
				({ name }) => name === $routeToken
			) ?? DEFAULT_ETHEREUM_TOKEN
		);
	}
);

export const tokenId: Readable<TokenId> = derived([token], ([{ id }]) => id);

export const tokenStandard: Readable<TokenStandard> = derived(
	[token],
	([{ standard }]) => standard
);

export const tokenSymbol: Readable<string> = derived([token], ([$token]) => $token.symbol);

export const tokenDecimals: Readable<number> = derived([token], ([$token]) => $token.decimals);
