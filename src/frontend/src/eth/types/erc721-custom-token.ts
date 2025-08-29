import type { Erc721Token } from '$eth/types/erc721';
import type { CustomToken } from '$lib/types/custom-token';

export type Erc721CustomToken = CustomToken<Erc721Token>;

export type SaveErc721CustomToken = Pick<
	Erc721CustomToken,
	'enabled' | 'version' | 'address' | 'network' | 'section'
> &
	Partial<Pick<Erc721CustomToken, 'id'>>;
