import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import type { EnvIcrcToken, EnvIcrcTokenMetadata } from '$env/types/env-icrc-token';
import type { IcToken, IcTokenWithoutId } from '$icp/types/ic-token';
import type { TokenToggleable, UserTokenState } from '$lib/types/token-toggleable';
import type { Option } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';

export type IcrcCustomTokenExtra = Pick<EnvIcrcTokenMetadata, 'alternativeName'> &
	Partial<Pick<EnvIcrcToken, 'indexCanisterVersion'>>;

export type IcTokenWithoutIdExtended = IcTokenWithoutId & IcrcCustomTokenExtra;

export type IcrcCustomTokenWithoutId = UserTokenState & IcTokenWithoutIdExtended;

export type IcrcCustomToken = TokenToggleable<IcToken> & IcrcCustomTokenExtra;

export type OptionIcrcCustomToken = Option<IcrcCustomToken>;

export function isIcrcCustomTokenDisabled(token: IcrcCustomToken): boolean {
	return nonNullish(token)
		? token.indexCanisterVersion === 'outdated' ||
				(token.category === 'default' && token.standard === 'icp') ||
				ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(token.ledgerCanisterId)
		: false;
}
