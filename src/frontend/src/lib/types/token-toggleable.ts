import type { CustomToken, UserToken } from '$declarations/backend/backend.did';
import type { Token } from '$lib/types/token';
import type { CustomTokenSection } from '$lib/enums/custom-token-section';

// Type pick and omit fields to make the reader aware that we are redefining the two fields we are interested in.
export type UserTokenState = Omit<
	Pick<UserToken | CustomToken, 'version' | 'enabled' | 'section'>,
	'version' | 'enabled' | 'section'
> & {
	version?: bigint;
	enabled: boolean;
	section?: CustomTokenSection;
};

export type TokenToggleable<T extends Token> = T & UserTokenState;
