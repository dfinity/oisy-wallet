import type { TokenMetadata } from '$lib/types/token';

// The Content Security Policy (CSP) allows any/most image URL.
// For now we will harden the token metadata by removing the icon since it may be provided by a unsafe URL.
// TODO: Make the user choose whether to keep the icon or not.
export const hardenMetadata = <T extends Partial<TokenMetadata>>({ icon: _, ...rest }: T): T =>
	rest as T;
