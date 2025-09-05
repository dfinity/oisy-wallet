import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export const mockPrincipalText = 'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe';
export const mockPrincipalText2 = 'fnpyv-uis4m-k44er-rkmzg-geafl-jpurz-55cq2-vcdkm-q66js-taqiz-pqe';

export const mockPrincipal = Principal.fromText(mockPrincipalText);
export const mockPrincipal2 = Principal.fromText(mockPrincipalText2);

const transformRequest = () => {
	console.error(
		'It looks like the agent is trying to make a request that should have been mocked at',
		new Error().stack
	);
	throw new Error('Not implemented');
};

export const mockIdentity = {
	getPrincipal: () => mockPrincipal,
	transformRequest
} as unknown as Identity;

// This is not linked/related to the mock above.
export const mockAccountIdentifierText =
	'217966d936e84b04ac69615cd5cf8c526667daf5ae88deb3bc2cdc44238712d5';
