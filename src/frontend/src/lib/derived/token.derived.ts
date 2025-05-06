import { icTokenEthereumUserToken } from '$eth/utils/erc20.utils';
import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
import {
	DEFAULT_BASE_TOKEN,
	DEFAULT_BITCOIN_TOKEN,
	DEFAULT_BSC_TOKEN,
	DEFAULT_ETHEREUM_TOKEN,
	DEFAULT_SOLANA_TOKEN
} from '$lib/constants/tokens.constants';
import {
	networkBase,
	networkBitcoin,
	networkEthereum,
	networkEvm,
	networkSolana
} from '$lib/derived/network.derived';
import { token } from '$lib/stores/token.store';
import type { OptionTokenId, OptionTokenStandard, Token } from '$lib/types/token';
import {
	isEthereumTokenToggleEnabled,
	isIcrcTokenToggleEnabled
} from '$lib/utils/token-toggle.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const defaultFallbackToken: Readable<Token> = derived(
	[networkBitcoin, networkEthereum, networkBase, networkEvm, networkSolana],
	([$networkBitcoin, $networkEthereum, $networkBase, $networkEvm, $networkSolana]) => {
		if ($networkBitcoin) {
			return DEFAULT_BITCOIN_TOKEN;
		}
		if ($networkSolana) {
			return DEFAULT_SOLANA_TOKEN;
		}
		if ($networkEthereum) {
			return DEFAULT_ETHEREUM_TOKEN;
		}
		if ($networkBase) {
			return DEFAULT_BASE_TOKEN;
		}
		if ($networkEvm) {
			return DEFAULT_BSC_TOKEN;
		}

		return DEFAULT_ETHEREUM_TOKEN;
	}
);

/**
 * A derived store which can be used for code convenience reasons.
 */
export const tokenWithFallback: Readable<Token> = derived(
	[token, defaultFallbackToken],
	([$token, $defaultFallbackToken]) => $token ?? $defaultFallbackToken
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
