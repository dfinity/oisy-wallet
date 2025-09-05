import type { CustomToken } from '$lib/types/custom-token';
import type { SplToken } from '$sol/types/spl';

export type SplCustomToken = CustomToken<SplToken>;

export type SaveSplCustomToken = Pick<
	SplCustomToken,
	'enabled' | 'version' | 'symbol' | 'decimals' | 'address' | 'network'
> &
	Partial<Pick<SplCustomToken, 'id'>>;
