import { isTokenIcNft, toIcNftSendErrorType } from '$icp/utils/ic-nft.utils';
import { CanisterInternalError } from '$lib/canisters/errors';
import { PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES } from '$lib/enums/plausible';
import type { TokenStandardCode } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockAccountIdentifierText } from '$tests/mocks/identity.mock';
import {
	CertifiedRejectErrorCode,
	RejectError,
	ReplicaRejectCode,
	requestIdOf
} from '@icp-sdk/core/agent';

describe('ic-nft.utils', () => {
	describe('isTokenIcNft', () => {
		it.each(['ext', 'dip721', 'icpunks', 'icrc7'])(
			'should return true for valid token standards: %s',
			(standard) => {
				expect(
					isTokenIcNft({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeTruthy();
			}
		);

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcNft({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});

	describe('toIcNftSendErrorType', () => {
		it('should categorise an error variant the collection returned', () => {
			const err = new CanisterInternalError(`Unauthorized account: ${mockAccountIdentifierText}`);

			expect(toIcNftSendErrorType(err)).toBe(PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.CANISTER_ERROR);
		});

		it('should categorise a call the collection rejected', () => {
			const err = RejectError.fromCode(
				new CertifiedRejectErrorCode(
					requestIdOf({ method_name: 'transfer' }),
					ReplicaRejectCode.CanisterError,
					'Canister trapped',
					'IC0503'
				)
			);

			expect(toIcNftSendErrorType(err)).toBe(PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.CALL_REJECTED);
		});

		it.each([new Error('Invalid character: "."'), 'offline', undefined])(
			'should categorise anything else as unknown: %s',
			(err) => {
				expect(toIcNftSendErrorType(err)).toBe(PLAUSIBLE_EVENT_NFT_SEND_ERROR_TYPES.UNKNOWN);
			}
		);
	});
});
