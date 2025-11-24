import type {
	Listing,
	TokenIdentifier,
	TokenIndex,
	Transaction
} from '$declarations/ext_v2_token/ext_v2_token.did';
import { mapExtTokensListing } from '$icp/utils/ext-v2-token.utils';
import type { CanisterIdText } from '$lib/types/canister';
import { bn1Bi, bn2Bi } from '$tests/mocks/balances.mock';
import {
	mockAccountIdentifierText,
	mockAccountIdentifierText2,
	mockPrincipal
} from '$tests/mocks/identity.mock';

export const mockExtV2TokenCanisterId: CanisterIdText = 'oeee4-qaaaa-aaaak-qaaeq-cai';
export const mockExtV2TokenCanisterId2: CanisterIdText = 'rhg63-2aaaa-aaaag-qcwhq-cai';
export const mockExtV2TokenCanisterId3: CanisterIdText = 'ckbgq-4yaaa-aaaak-qi2xq-cai';

export const mockExtV2TokenIdentifier: TokenIdentifier =
	'7lok3-dakor-uwiaa-aaaaa-cuaab-eaqca-aacwh-q';

export const mockExtV2Transactions: Transaction[] = [
	{
		token: 1,
		time: 123_456n,
		seller: mockAccountIdentifierText,
		buyer: mockAccountIdentifierText2,
		price: bn1Bi
	},
	{
		token: 2,
		time: 123_789n,
		seller: mockAccountIdentifierText2,
		buyer: mockAccountIdentifierText,
		price: bn2Bi
	}
];

export const mockExtV2TokensListing: [TokenIndex, [] | [Listing], [] | [Uint8Array]][] = [
	[
		1780,
		[
			{
				locked: [],
				seller: mockPrincipal,
				price: 44_000_000n
			}
		],
		[Uint8Array.from([8, 6, 8, 1, 0])]
	],
	[
		2974,
		[
			{
				locked: [],
				seller: mockPrincipal,
				price: 45_000_000n
			}
		],
		[Uint8Array.from([14, 2, 7, 4, 0])]
	],
	[3955, [], [Uint8Array.from([15, 2, 4, 8, 0])]]
];

export const mockExtV2TokenIndexes: TokenIndex[] = mapExtTokensListing(mockExtV2TokensListing);
