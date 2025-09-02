import type { Erc1155Token } from '$eth/types/erc1155';
import type { CustomToken } from '$lib/types/custom-token';

export type Erc1155CustomToken = CustomToken<Erc1155Token>;

export type SaveErc1155CustomToken = Pick<
	Erc1155CustomToken,
	'enabled' | 'version' | 'address' | 'network' | 'section' | 'allowExternalContentSource'
> &
	Partial<Pick<Erc1155CustomToken, 'id'>>;
