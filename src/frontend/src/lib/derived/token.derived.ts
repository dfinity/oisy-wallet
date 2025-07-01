import { isTokenEthereumUserToken } from '$eth/utils/erc20.utils';
import { isNotDefaultEthereumToken } from '$eth/utils/eth.utils';
import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
import {
	DEFAULT_ARBITRUM_TOKEN,
	DEFAULT_BASE_TOKEN,
	DEFAULT_BITCOIN_TOKEN,
	DEFAULT_BSC_TOKEN,
	DEFAULT_ETHEREUM_TOKEN,
	DEFAULT_POLYGON_TOKEN,
	DEFAULT_SOLANA_TOKEN
} from '$lib/constants/tokens.constants';
import {
	networkArbitrum,
	networkBase,
	networkBitcoin,
	networkBsc,
	networkEthereum,
	networkPolygon,
	networkSolana
} from '$lib/derived/network.derived';
import { token } from '$lib/stores/token.store';
import type { OptionTokenId, OptionTokenStandard, Token } from '$lib/types/token';
import { isIcrcTokenToggleEnabled } from '$lib/utils/token-toggle.utils';
import { isTokenSpl, isTokenSplToggleable } from '$sol/utils/spl.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const defaultFallbackToken: Readable<Token> = derived(
	[
		networkBitcoin,
		networkEthereum,
		networkBase,
		networkBsc,
		networkPolygon,
		networkSolana,
		networkArbitrum
	],
	([
		$networkBitcoin,
		$networkEthereum,
		$networkBase,
		$networkBsc,
		$networkPolygon,
		$networkSolana,
		$networkArbitrum
	]) => {
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
		if ($networkBsc) {
			return DEFAULT_BSC_TOKEN;
		}
		if ($networkPolygon) {
			return DEFAULT_POLYGON_TOKEN;
		}
		if ($networkArbitrum) {
			return DEFAULT_ARBITRUM_TOKEN;
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
			: isTokenEthereumUserToken($token)
				? isNotDefaultEthereumToken($token)
				: isTokenSpl($token)
					? isTokenSplToggleable($token)
					: false;
	}

	return false;
});
