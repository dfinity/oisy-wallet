import type { CustomToken, UserToken } from '$declarations/backend/backend.did';
import type { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { Token } from '$lib/types/token';

// Type pick and omit fields to make the reader aware that we are redefining the two fields we are interested in.
export type UserTokenState = Omit<
	Pick<UserToken | CustomToken, 'version' | 'enabled'>,
	'version' | 'enabled' | 'section'
> & {
	version?: bigint;
	enabled: boolean;
	section?: CustomTokenSection;
};

export type TokenToggleable<T extends Token> = T & UserTokenState;
