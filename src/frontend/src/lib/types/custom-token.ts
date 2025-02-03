import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import type { UserTokenState } from '$lib/types/token-toggleable';
import type { SplToken } from '$sol/types/spl';

export type CustomTokenNetworkKeys = 'Icrc' | 'SplMainnet' | 'SplDevnet';

export type IcrcSaveCustomToken = Pick<IcrcCustomToken, 'ledgerCanisterId' | 'indexCanisterId'>;

export type SplSaveCustomToken = Pick<SplToken, 'address' | 'decimals' | 'symbol'>;

export type IcrcSaveCustomTokenWithKey = IcrcSaveCustomToken & {
	networkKey: Extract<CustomTokenNetworkKeys, 'Icrc'>;
};

export type SplSaveCustomTokenWithKey = SplSaveCustomToken & {
	networkKey: Extract<CustomTokenNetworkKeys, 'SplMainnet' | 'SplDevnet'>;
};

export type SaveCustomToken = UserTokenState &
	(IcrcSaveCustomTokenWithKey | SplSaveCustomTokenWithKey);

export type SaveCustomTokenWithKey = UserTokenState &
	(IcrcSaveCustomToken & {
		networkKey: Extract<CustomTokenNetworkKeys, 'Icrc'>;
	});
