import { isBitcoinToken } from '$btc/utils/token.utils';
import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import type { EthereumUserToken } from '$eth/types/erc20-user-token';
import { icTokenEthereumUserToken } from '$eth/utils/erc20.utils';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
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
			toggleable = !isIcTokenIcrcCustomTokenDisabled($token);
		} else if (icTokenEthereumUserToken($token)) {
			toggleable = !isIcTokenEthereumUserTokenDisabled($token);
		} else if (isBitcoinToken($token)) {
			toggleable = false;
		}

		console.log($token);
		console.log(toggleable);
		console.log('enabled' in $token);

		return toggleable;
	} else {
		return false;
	}
});

function isIcTokenIcrcCustomTokenDisabled(token: IcrcCustomToken): boolean {
	let outdated: boolean;
	outdated = token.indexCanisterVersion === 'outdated';
	return (
		(token.category === 'default' && token.standard === 'icp') ||
		ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(token.ledgerCanisterId) ||
		outdated
	);
}

function isIcTokenEthereumUserTokenDisabled(token: EthereumUserToken): boolean {
	return token.category === 'default' && token.standard === 'ethereum';
}
