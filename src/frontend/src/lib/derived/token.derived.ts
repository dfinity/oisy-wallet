import { isBitcoinToken } from '$btc/utils/token.utils';
import { isEthereumUserTokenDisabled } from '$eth/types/erc20-user-token';
import { icTokenEthereumUserToken } from '$eth/utils/erc20.utils';
import { isIcrcCustomTokenDisabled } from '$icp/types/icrc-custom-token';
import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { token } from '$lib/stores/token.store';
import type { OptionTokenId, OptionTokenStandard, Token } from '$lib/types/token';
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

export const tokenSymbol: Readable<string | undefined> = derived(
	[token],
	([$token]) => $token?.symbol
);

export const tokenDecimals: Readable<number | undefined> = derived(
	[token],
	([$token]) => $token?.decimals
);

export const tokenToggleable: Readable<boolean> = derived([token], ([$token]) => {
	if (nonNullish($token)) {
		let toggleable = false;

		if (icTokenIcrcCustomToken($token)) {
			toggleable = !isIcrcCustomTokenDisabled($token);
		} else if (icTokenEthereumUserToken($token)) {
			toggleable = !isEthereumUserTokenDisabled($token);
		} else if (isBitcoinToken($token)) {
			toggleable = false;
		}

		console.log($token);
		console.log(toggleable);
		console.log('enabled' in $token);

		return toggleable;
	}

	return false;
});
