import type { CustomToken } from '$declarations/backend/backend.did';
import type { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { Token } from '$lib/types/token';

// Type pick and omit fields to make the reader aware that we are redefining the fields we are interested in.
export type CustomTokenState = Omit<
	Pick<CustomToken, 'version' | 'enabled' | 'section' | 'allow_external_content_source'>,
	'version' | 'enabled' | 'section' | 'allow_external_content_source'
> & {
	version?: bigint;
	enabled: boolean;
	section?: CustomTokenSection;
	allowExternalContentSource?: boolean;
};

export type TokenToggleable<T extends Token> = T & CustomTokenState;
