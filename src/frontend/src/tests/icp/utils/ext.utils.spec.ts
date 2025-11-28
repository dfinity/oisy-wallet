import type { TokenIdentifier, TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
import { extIndexToIdentifier, isTokenExtV2 } from '$icp/utils/ext.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { TokenStandard } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

describe('ext.utils', () => {
	describe('isTokenExtV2', () => {
		it.each(['extV2'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenExtV2({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenExtV2({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);
	});

	describe('extIndexToIdentifier', () => {
		// Real values from https://entrepot.app/
		const testCases: {
			canisterId: CanisterIdText;
			index: TokenIndex;
			expected: TokenIdentifier;
		}[] = [
			{
				canisterId: 'oeee4-qaaaa-aaaak-qaaeq-cai',
				index: 9584,
				expected: 'bcmhj-4qkor-uwiaa-aaaaa-cuaab-eaqca-aaevy-a'
			},
			{
				canisterId: 'oeee4-qaaaa-aaaak-qaaeq-cai',
				index: 1699,
				expected: 'vhvyb-7ikor-uwiaa-aaaaa-cuaab-eaqca-aaa2r-q'
			},
			{
				canisterId: 'bzsui-sqaaa-aaaah-qce2a-cai',
				index: 6441,
				expected: 'dmp7r-kakor-uwiaa-aaaaa-b4arg-qaqca-aadeu-q'
			},
			{
				canisterId: '4vy4g-waaaa-aaaag-qcxpq-cai',
				index: 8861,
				expected: '5s6r5-mikor-uwiaa-aaaaa-buav3-4aqca-aaeko-q'
			}
		];

		it.each(testCases)(
			'should return correct identifier for canisterId $canisterId and index $index',
			({ canisterId, index, expected }) => {
				const collectionId = Principal.fromText(canisterId);

				expect(extIndexToIdentifier({ collectionId, index })).toBe(expected);
			}
		);

		it('should throw an error for negative index', () => {
			const collectionId = Principal.fromText('oeee4-qaaaa-aaaak-qaaeq-cai');
			const index = -1;

			expect(() => extIndexToIdentifier({ collectionId, index })).toThrow(
				'EXT token index -1 is out of bounds'
			);
		});
	});
});
