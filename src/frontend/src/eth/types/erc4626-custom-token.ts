import type { Erc4626Token } from '$eth/types/erc4626';
import type { CustomToken } from '$lib/types/custom-token';

export type Erc4626CustomToken = CustomToken<Erc4626Token>;

export type SaveErc4626CustomToken = Pick<
	Erc4626CustomToken,
	'enabled' | 'version' | 'symbol' | 'decimals' | 'address' | 'network'
> &
	Partial<Pick<Erc4626CustomToken, 'id'>>;
