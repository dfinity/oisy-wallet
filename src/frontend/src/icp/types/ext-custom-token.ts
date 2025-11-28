import type { ExtToken } from '$icp/types/ext-token';
import type { CustomToken } from '$lib/types/custom-token';

export type ExtCustomToken = CustomToken<ExtToken>;

export type SaveExtCustomToken = Pick<
	ExtCustomToken,
	'enabled' | 'version' | 'canisterId' | 'network' | 'section' | 'allowExternalContentSource'
> &
	Partial<Pick<ExtCustomToken, 'id'>>;
