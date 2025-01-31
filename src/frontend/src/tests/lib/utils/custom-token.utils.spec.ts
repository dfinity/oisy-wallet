import type { SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@dfinity/principal';
import { isNullish, toNullable } from '@dfinity/utils';

describe('custom-token.utils', () => {
	describe('toCustomToken', () => {
		describe.each([undefined, mockIndexCanisterId])('with index ID %s', (indexCanisterId) => {
			it.each([undefined, 2n])('should convert to CustomToken with version %s', (version) => {
				const input: SaveCustomToken = {
					enabled: true,
					version,
					ledgerCanisterId: mockLedgerCanisterId,
					indexCanisterId
				};

				const result = toCustomToken(input);

				expect(result).toEqual({
					enabled: input.enabled,
					version: toNullable(version),
					token: {
						Icrc: {
							ledger_id: Principal.fromText(input.ledgerCanisterId),
							index_id: toNullable(
								isNullish(indexCanisterId) ? undefined : Principal.fromText(indexCanisterId)
							)
						}
					}
				});
			});
		});
	});
});
