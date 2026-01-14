import type {
	Listing,
	Metadata,
	MetadataLegacy,
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
import { toNullable } from '@dfinity/utils';

export const mockExtV2TokenCanisterId: CanisterIdText = 'oeee4-qaaaa-aaaak-qaaeq-cai';
export const mockExtV2TokenCanisterId2: CanisterIdText = 'rhg63-2aaaa-aaaag-qcwhq-cai';
export const mockExtV2TokenCanisterId3: CanisterIdText = 'ckbgq-4yaaa-aaaak-qi2xq-cai';

export const mockExtV2TokenIdentifier: TokenIdentifier =
	'7lok3-dakor-uwiaa-aaaaa-cuaab-eaqca-aacwh-q';
export const mockExtV2TokenIdentifier2: TokenIdentifier =
	'kz6x4-7akor-uwiaa-aaaaa-cue46-4aqca-aaah4-a';
export const mockExtV2TokenIdentifier3: TokenIdentifier =
	'tdxsh-eqkor-uwiaa-aaaaa-cue46-4aqca-aacpd-q';

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

export const mockExtMetadata: Metadata = {
	nonfungible: {
		metadata: toNullable({ blob: new Uint8Array([1, 2, 3]) }),
		name: 'Mock NFT',
		thumbnail: 'https://example.com/thumbnail.png',
		asset: 'https://example.com/asset.png'
	}
};

export const mockExtLegacyMetadata: MetadataLegacy = {
	nonfungible: {
		metadata: toNullable(new Uint8Array([4, 5, 6]))
	}
};

export const mockExtDecodedMetadata =
	'{"category": "Default", "thumb": "https://vofqk-yyaaa-aaaap-qa3na-cai.raw.ic0.app/file/5826.gif", "name": "Nyannyan #5826", "url": "https://vofqk-yyaaa-aaaap-qa3na-cai.raw.ic0.app/file/5826.gif", "timestamp": 1678871323381, "description": "", "attributes": [{"trait_type": "Background", "value": "SkyBlue"}, {"trait_type": "Body", "value": "British Shorthair"}, {"trait_type": "Accessory 2", "value": "Boom"}, {"trait_type": "Accessory 1", "value": "Lightning strike"}], "mimeType": "image"}';

export const mockExtParsedMetadata = JSON.parse(mockExtDecodedMetadata);
