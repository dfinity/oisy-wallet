import type { Account, TransferResult, Value } from '$declarations/icrc7/icrc7.did';
import type { Icrc7TokenMetadata } from '$icp/canisters/icrc7.canister';
import { mockPrincipal } from '$tests/mocks/identity.mock';

export const mockIcrc7TokenIds: bigint[] = [12345n, 54321n];

export const mockIcrc7Account: Account = {
	owner: mockPrincipal,
	subaccount: []
};

export const mockIcrc7TokenMetadataEntries: Array<[string, Value]> = [
	['icrc7:name', { Text: 'Mock ICRC-7 NFT' }],
	['icrc7:description', { Text: 'Description for a mock ICRC-7 NFT' }],
	['icrc7:image', { Text: 'https://example.com/icrc7/1.png' }],
	['background', { Text: 'Yellow' }],
	['rarity', { Nat: 42n } as Value]
];

export const mockIcrc7TokenMetadata: Icrc7TokenMetadata = {
	name: 'Mock ICRC-7 NFT',
	description: 'Description for a mock ICRC-7 NFT',
	imageUrl: 'https://example.com/icrc7/1.png',
	attributes: [
		{ name: 'background', value: 'Yellow' },
		{ name: 'rarity', value: '42' }
	]
};

export const mockIcrc7CollectionMetadata = {
	symbol: 'ICRC7',
	name: 'Mock ICRC-7 Collection',
	description: 'A collection of ICRC-7 NFTs',
	icon: 'https://example.com/icrc7/logo.png'
};

export const mockIcrc7TransferOk: TransferResult = { Ok: 1n };

export const mockIcrc7TransferErrUnauthorized: TransferResult = { Err: { Unauthorized: null } };
