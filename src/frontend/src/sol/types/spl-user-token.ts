import type { UserToken } from '$lib/types/user-token';
import type { SplToken } from '$sol/types/spl';

export type SplUserToken = UserToken<SplToken>;

export type SaveSplUserToken = Pick<
	SplUserToken,
	'enabled' | 'version' | 'symbol' | 'decimals' | 'address' | 'network'
> &
	Partial<Pick<SplUserToken, 'id'>>;
