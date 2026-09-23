import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { buildIcTokenLabels, buildIndexedIcTokens } from '$icp/utils/ic-tokens.utils';
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

	describe('buildIcTokenLabels', () => {
		const real = {
			...mockValidIcToken,
			symbol: 'XYZ',
			name: 'XYZ Token',
			ledgerCanisterId: 'qaa6y-5yaaa-aaaaa-aaafa-cai'
		};
		const impostor = { ...real, ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai' };

		it('labels a token by its symbol when no other ledger claims it', () => {
			expect(buildIcTokenLabels([ICP_TOKEN, real]).get(real.ledgerCanisterId)).toBe('XYZ');
		});

		it('suffixes both ledgers with their ids when they share a symbol', () => {
			const labels = buildIcTokenLabels([ICP_TOKEN, real, impostor]);

			expect(labels.get(real.ledgerCanisterId)).toBe('XYZ (qaa6y-5...afa-cai)');
			expect(labels.get(impostor.ledgerCanisterId)).toBe('XYZ (mxzaz-h...ada-cai)');
			expect(labels.get(ICP_TOKEN.ledgerCanisterId)).toBe(ICP_TOKEN.symbol);
		});

		it('treats a shared symbol as a collision even when the names differ', () => {
			// Results show no name, so a differing name cannot tell the two apart there.
			const labels = buildIcTokenLabels([real, { ...impostor, name: 'Something Else' }]);

			expect(labels.get(impostor.ledgerCanisterId)).toBe('XYZ (mxzaz-h...ada-cai)');
		});

		it('does not flag a ledger listed twice as a collision with itself', () => {
			// A default token that is also an enabled custom one arrives twice in enabledIcrcTokens.
			const labels = buildIcTokenLabels([real, { ...real, name: 'custom entry' }]);

			expect(labels.get(real.ledgerCanisterId)).toBe('XYZ');
		});

		it('labels by the display symbol, which is what the user actually sees', () => {
			const renamed = { ...real, oisySymbol: { oisySymbol: 'OSYM' } };

			expect(buildIcTokenLabels([renamed, impostor]).get(real.ledgerCanisterId)).toBe('OSYM');
		});
	});
});
