import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks/networks.icrc.env';
import type { EthereumUserToken } from '$eth/types/erc20-user-token';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isTokenIcp } from '$icp/utils/icrc.utils';
import { nonNullish } from '@dfinity/utils';

// TODO: Check why this functionality is used instead of eth.utils.ts -> isSupportedEthToken.
export const isEthereumTokenToggleDisabled = (token: EthereumUserToken): boolean =>
	nonNullish(token) && token.category === 'default' && token.standard === 'ethereum';

export const isEthereumTokenToggleEnabled = (token: EthereumUserToken): boolean =>
	!isEthereumTokenToggleDisabled(token);

// TODO: Like above - check why this functionality is used.
export const isIcrcTokenToggleDisabled = (token: IcrcCustomToken): boolean =>
	(token.category === 'default' && isTokenIcp(token)) ||
	ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(token.ledgerCanisterId);

export const isIcrcTokenToggleEnabled = (token: IcrcCustomToken): boolean =>
	!isIcrcTokenToggleDisabled(token);
