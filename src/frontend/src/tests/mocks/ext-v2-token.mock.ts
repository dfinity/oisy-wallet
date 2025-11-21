import type { TokenIdentifier, Transaction } from '$declarations/ext_v2_token/ext_v2_token.did';
import type { CanisterIdText } from '$lib/types/canister';
import { bn1Bi, bn2Bi } from '$tests/mocks/balances.mock';
import { mockAccountIdentifierText, mockAccountIdentifierText2 } from '$tests/mocks/identity.mock';

export const mockExtV2TokenCanisterId: CanisterIdText = 'oeee4-qaaaa-aaaak-qaaeq-cai';

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
