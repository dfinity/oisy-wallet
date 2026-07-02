import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
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
	networkICP,
	networkPolygon,
	networkSolana
} from '$lib/derived/network.derived';
import { token } from '$lib/stores/token.store';
import type { OptionTokenId, RequiredToken, Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const defaultFallbackToken: Readable<RequiredToken> = derived(
	[
		networkBitcoin,
		networkEthereum,
		networkBase,
		networkBsc,
		networkPolygon,
		networkSolana,
		networkArbitrum,
		networkICP
	],
	([
		$networkBitcoin,
		$networkEthereum,
		$networkBase,
		$networkBsc,
		$networkPolygon,
		$networkSolana,
		$networkArbitrum,
		$networkICP
	]) => {
		if ($networkBitcoin) {
			return DEFAULT_BITCOIN_TOKEN;
		}
		if ($networkSolana) {
			return DEFAULT_SOLANA_TOKEN;
		}
		if ($networkICP) {
			return ICP_TOKEN;
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
