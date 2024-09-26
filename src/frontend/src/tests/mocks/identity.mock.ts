import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const mockPrincipalText = 'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe';

export const mockPrincipal = Principal.fromText(mockPrincipalText);

export const mockIdentity = {
	getPrincipal: () => mockPrincipal
} as unknown as Identity;
