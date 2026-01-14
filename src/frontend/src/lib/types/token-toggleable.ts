import type { CustomToken } from '$declarations/backend/backend.did';
import type { Token } from '$lib/types/token';

// Type pick and omit fields to make the reader aware that we are redefining the two fields we are interested in.
export type CustomTokenState = Omit<
	Pick<CustomToken, 'version' | 'enabled'>,
	'version' | 'enabled'
> & {
	version?: bigint;
	enabled: boolean;
};

export type TokenToggleable<T extends Token> = T & CustomTokenState;
