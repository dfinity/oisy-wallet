import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export const mockPrincipalText = 'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe';

export const mockPrincipal = Principal.fromText(mockPrincipalText);

export const mockIdentity = {
	getPrincipal: () => mockPrincipal
} as unknown as Identity;

// This is not linked/related to the mock above.
export const mockAccountIdentifierText =
	'217966d936e84b04ac69615cd5cf8c526667daf5ae88deb3bc2cdc44238712d5';
