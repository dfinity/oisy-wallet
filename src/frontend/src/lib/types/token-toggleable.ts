import type { CustomToken } from '$declarations/backend/backend.did';
import type { NonFungibleTokenAppearance } from '$lib/types/nft-ui';
import type { Token } from '$lib/types/token';

// Type pick and omit fields to make the reader aware that we are redefining the two fields we are interested in.
export type CustomTokenState = Omit<
	Pick<CustomToken, 'version' | 'enabled'>,
	'version' | 'enabled' | 'section' | 'allowExternalContentSource'
> & {
	version?: bigint;
	enabled: boolean;
} & NonFungibleTokenAppearance;

export type TokenToggleable<T extends Token> = T & CustomTokenState;
