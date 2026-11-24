import { SignerCanisterInsufficientAllowanceError } from '$lib/canisters/signer.errors';
import type { AllowanceRequestAnswer } from '$lib/types/api';
import { Principal } from '@icp-sdk/core/principal';

export const mockAllowanceLeft = 5_000_000_000n;

// A CC that failed with `mockAllowanceLeft` left, followed by an AR with the given answer.
export const mockInsufficientAllowanceError = (
	allowanceRequest: AllowanceRequestAnswer
): SignerCanisterInsufficientAllowanceError =>
	new SignerCanisterInsufficientAllowanceError({
		paymentError: {
			LedgerWithdrawFromError: {
				error: { InsufficientAllowance: { allowance: mockAllowanceLeft } },
				ledger: Principal.fromText('um5iw-rqaaa-aaaaq-qaaba-cai')
			}
		},
		allowance: mockAllowanceLeft,
		allowanceRequest
	});
