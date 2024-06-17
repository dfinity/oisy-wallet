import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { icrcTokens } from '$icp/derived/icrc.derived';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { routeToken } from '$lib/derived/nav.derived';
import type {
	OptionToken,
	OptionTokenId,
	OptionTokenStandard,
	Token,
	TokenCategory
} from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const token: Readable<OptionToken> = derived(
	[routeToken, erc20Tokens, icrcTokens],
	([$routeToken, $erc20Tokens, $icrcTokens]) => {
		if (isNullish($routeToken)) {
			return undefined;
		}

		if ($routeToken === ICP_TOKEN.name) {
			return ICP_TOKEN;
		}

		return [...$erc20Tokens, ...$icrcTokens, ETHEREUM_TOKEN, SEPOLIA_TOKEN].find(
			({ name }) => name === $routeToken
		);
	}
);

/**
 * A derived store which can be used for code convenience reasons.
 */
export const tokenWithFallback: Readable<Token> = derived(
	[token],
	([$token]) => $token ?? DEFAULT_ETHEREUM_TOKEN
);

export const tokenId: Readable<OptionTokenId> = derived([token], ([$token]) => $token?.id);

export const tokenStandard: Readable<OptionTokenStandard> = derived(
	[token],
	([$token]) => $token?.standard
);

export const tokenSymbol: Readable<string | undefined> = derived(
	[token],
	([$token]) => $token?.symbol
);

export const tokenDecimals: Readable<number | undefined> = derived(
	[token],
	([$token]) => $token?.decimals
);

export const tokenCategory: Readable<TokenCategory | undefined> = derived(
	[token],
	([$token]) => $token?.category
);
