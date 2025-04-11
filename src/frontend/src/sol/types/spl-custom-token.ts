import type { UserToken } from '$lib/types/user-token';
import type { SplToken } from '$sol/types/spl';

export type SplCustomToken = UserToken<SplToken>;

export type SaveSplCustomToken = Pick<
	SplCustomToken,
	'enabled' | 'version' | 'symbol' | 'decimals' | 'address' | 'network'
> &
	Partial<Pick<SplCustomToken, 'id'>>;
