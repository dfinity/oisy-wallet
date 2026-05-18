import type { Account, Value } from '$declarations/icrc7/icrc7.did';
import { mockPrincipal } from '$tests/mocks/identity.mock';

export const mockIcrc7Account: Account = {
	owner: mockPrincipal,
	subaccount: []
};

// Standard ICRC-7 collection metadata keys.
// Reference: https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7/ICRC-7.md#icrc7_collection_metadata
export const mockIcrc7CollectionMetadata: Array<[string, Value]> = [
	['icrc7:name', { Text: 'Cosmicrafts Avatars' }],
	['icrc7:symbol', { Text: 'CCC' }],
	['icrc7:description', { Text: 'Mock ICRC-7 collection used in tests.' }],
	['icrc7:logo', { Text: 'data:image/svg+xml;utf8,<svg/>' }],
	['icrc7:total_supply', { Nat: 1000n }],
	['icrc7:supply_cap', { Nat: 10_000n }]
];

export const mockIcrc7TokenMetadata: Array<[string, Value]> = [
	['icrc7:metadata:uri', { Text: 'https://example.com/nft/1.json' }],
	['icrc7:metadata:name', { Text: 'Mock ICRC-7 NFT #1' }]
];
