import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks/networks.icrc.env';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { isTokenIcp } from '$icp/utils/icrc.utils';

// TODO: Like above - check why this functionality is used.
export const isIcrcTokenToggleDisabled = (token: IcrcCustomToken): boolean =>
	(token.category === 'default' && isTokenIcp(token)) ||
	ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(token.ledgerCanisterId);

export const isIcrcTokenToggleEnabled = (token: IcrcCustomToken): boolean =>
	!isIcrcTokenToggleDisabled(token);
