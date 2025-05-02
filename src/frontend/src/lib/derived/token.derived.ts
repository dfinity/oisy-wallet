import { icTokenEthereumUserToken } from '$eth/utils/erc20.utils';
import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { token } from '$lib/stores/token.store';
import type { OptionTokenId, OptionTokenStandard, Token } from '$lib/types/token';
import {
	isEthereumTokenToggleEnabled,
	isIcrcTokenToggleEnabled
} from '$lib/utils/token-toggle.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

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

export const tokenToggleable: Readable<boolean> = derived([token], ([$token]) => {
	if (nonNullish($token)) {
		return icTokenIcrcCustomToken($token)
			? isIcrcTokenToggleEnabled($token)
			: icTokenEthereumUserToken($token)
				? isEthereumTokenToggleEnabled($token)
				: false;
	}

	return false;
});
