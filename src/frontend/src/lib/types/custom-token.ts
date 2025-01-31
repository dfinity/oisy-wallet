import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import type { UserTokenState } from '$lib/types/token-toggleable';

export type CustomTokenNetworkKeys = 'Icrc';

export type IcrcSaveCustomToken = Pick<IcrcCustomToken, 'ledgerCanisterId' | 'indexCanisterId'>;

export type IcrcSaveCustomTokenWithKey = IcrcSaveCustomToken & {
	networkKey: Extract<CustomTokenNetworkKeys, 'Icrc'>;
};

export type SaveCustomToken = UserTokenState & IcrcSaveCustomTokenWithKey;
