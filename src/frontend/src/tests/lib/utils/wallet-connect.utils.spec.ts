import { acceptedContext } from '$lib/utils/wallet-connect.utils';
import type { Verify } from '@walletconnect/types';

describe('wallet-connect.utils', () => {
	describe('acceptedContext', () => {
		const context = (verified: Partial<Verify.Context['verified']>): Verify.Context => ({
			verified: {
				verifyUrl: 'https://verify.walletconnect.org',
				validation: 'VALID',
				origin: 'https://dapp.example',
				...verified
			}
		});

		it('accepts a proposal Verify does not flag', () => {
			expect(acceptedContext(context({ isScam: false }))).toBeTruthy();
		});

		it('accepts a proposal Verify returned no scam verdict for', () => {
			expect(acceptedContext(context({}))).toBeTruthy();
		});

		it('accepts a proposal without a verify context', () => {
			expect(acceptedContext(undefined)).toBeTruthy();
		});

		// A flagged site served from its own domain still validates, so the flag alone decides.
		it.each(['VALID', 'INVALID', 'UNKNOWN'] as const)(
			'refuses a proposal Verify flags as a scam when its domain validation is %s',
			(validation) => {
				expect(acceptedContext(context({ validation, isScam: true }))).toBeFalsy();
			}
		);
	});
});
