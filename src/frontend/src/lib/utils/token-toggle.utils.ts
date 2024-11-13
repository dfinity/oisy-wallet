import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import type { EthereumUserToken } from '$eth/types/erc20-user-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { nonNullish } from '@dfinity/utils';

// TODO: Check why this functionality is used instead of eth.utils.ts -> isSupportedEthToken.
export function isEthereumTokenToggleDisabled(token: EthereumUserToken): boolean {
	return nonNullish(token) && token.category === 'default' && token.standard === 'ethereum';
}

export function isEthereumTokenToggleEnabled(token: EthereumUserToken): boolean {
	return !isEthereumTokenToggleDisabled(token);
}

// TODO: Like above - check why this functionality is used.
export function isIcrcTokenToggleDisabled(token: IcrcCustomToken): boolean {
	return nonNullish(token)
		? token.indexCanisterVersion === 'outdated' ||
				(token.category === 'default' && token.standard === 'icp') ||
				ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(token.ledgerCanisterId)
		: false;
}

export function isIcrcTokenToggleEnabled(token: IcrcCustomToken): boolean {
	return !isIcrcTokenToggleDisabled(token);
}
