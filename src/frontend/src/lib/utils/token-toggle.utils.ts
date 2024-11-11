import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import type { EthereumUserToken } from '$eth/types/erc20-user-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { nonNullish } from '@dfinity/utils';

// TODO: check why this functionality is used instead of eth.utils.ts -> isSupportedEthToken.
export function isEthereumUserTokenDisabled(token: EthereumUserToken): boolean {
	return nonNullish(token) && token.category === 'default' && token.standard === 'ethereum';
}

export function isEthereumUserTokenEnabled(token: EthereumUserToken): boolean {
	return !isEthereumUserTokenDisabled(token);
}

// TODO: like above - check why this functionality is used.
export function isIcrcCustomTokenDisabled(token: IcrcCustomToken): boolean {
	return nonNullish(token)
		? token.indexCanisterVersion === 'outdated' ||
				(token.category === 'default' && token.standard === 'icp') ||
				ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(token.ledgerCanisterId)
		: false;
}

export function isIcrcCustomTokenEnabled(token: IcrcCustomToken): boolean {
	return !isIcrcCustomTokenDisabled(token);
}
