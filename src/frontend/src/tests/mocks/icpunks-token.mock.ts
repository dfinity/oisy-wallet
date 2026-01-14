import type { TokenDesc } from '$declarations/icpunks/icpunks.did';
import { mockPrincipal } from '$tests/mocks/identity.mock';

export const mockIcPunksMetadata: TokenDesc = {
	id: 4803n,
	url: '/Token/4803',
	owner: mockPrincipal,
	desc: 'Description for a mock ICPunks NFT',
	name: 'Mock ICPunks NFT',
	properties: [
		{
			value: 'Yellow',
			name: 'Background'
		},
		{
			value: 'Blue Hoodie',
			name: 'Body'
		},
		{
			value: 'None',
			name: 'Nose'
		},
		{
			value: 'None',
			name: 'Mouth'
		},
		{
			value: 'Love Sunglasses',
			name: 'Eyes'
		},
		{
			value: 'Red Shocked',
			name: 'Head'
		},
		{
			value: 'Blue Cap',
			name: 'Top'
		}
	]
};
