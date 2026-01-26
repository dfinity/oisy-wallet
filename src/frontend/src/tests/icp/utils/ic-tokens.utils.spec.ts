import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { buildIndexedIcTokens } from '$icp/utils/ic-tokens.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

describe('ic-tokens.utils', () => {
	describe('buildIndexedIcTokens', () => {
		const mockLedgerCanisterId = '123';
		const mockToken = { ...mockValidIcToken, ledgerCanisterId: mockLedgerCanisterId };
		const mockTokens = [mockValidIcToken, mockToken, ICP_TOKEN];

		it('should build a map of indexed tokens by Ledger canister ID', () => {
			expect(buildIndexedIcTokens(mockTokens)).toStrictEqual({
				[mockValidIcToken.ledgerCanisterId]: mockValidIcToken,
				[mockLedgerCanisterId]: mockToken,
				[ICP_TOKEN.ledgerCanisterId]: ICP_TOKEN
			});
		});

		it('should return an empty record if the list of tokens is empty', () => {
			expect(buildIndexedIcTokens([])).toStrictEqual({});
		});

		it('should handle partial IC tokens', () => {
			const { name: _, decimals: __, ...mockPartialToken } = mockToken;

			expect(buildIndexedIcTokens([mockValidIcToken, mockPartialToken, ICP_TOKEN])).toStrictEqual({
				[mockValidIcToken.ledgerCanisterId]: mockValidIcToken,
				[mockLedgerCanisterId]: mockPartialToken,
				[ICP_TOKEN.ledgerCanisterId]: ICP_TOKEN
			});
		});

		it('should handle IC tokens with Ledger canister ID only', () => {
			expect(
				buildIndexedIcTokens(mockTokens.map(({ ledgerCanisterId }) => ({ ledgerCanisterId })))
			).toStrictEqual({
				[mockValidIcToken.ledgerCanisterId]: {
					ledgerCanisterId: mockValidIcToken.ledgerCanisterId
				},
				[mockLedgerCanisterId]: { ledgerCanisterId: mockLedgerCanisterId },
				[ICP_TOKEN.ledgerCanisterId]: { ledgerCanisterId: ICP_TOKEN.ledgerCanisterId }
			});
		});
	});
});
