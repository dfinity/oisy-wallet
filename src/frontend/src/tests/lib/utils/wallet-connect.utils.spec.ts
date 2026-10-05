import { WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS } from '$lib/constants/wallet-connect.constants';
import {
	isWalletConnectDomainFlagged,
	isWalletConnectUncheckedSigningActive
} from '$lib/utils/wallet-connect.utils';
import type { Verify } from '@walletconnect/types';

describe('wallet-connect.utils', () => {
	describe('isWalletConnectUncheckedSigningActive', () => {
		const now = 1_700_000_000_000;

		it('should be on before the moment it turns itself off', () => {
			expect(
				isWalletConnectUncheckedSigningActive({
					expiresAt: now + WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS,
					now
				})
			).toBeTruthy();

			expect(isWalletConnectUncheckedSigningActive({ expiresAt: now + 1, now })).toBeTruthy();
		});

		it('should be off from the moment it turns itself off', () => {
			expect(isWalletConnectUncheckedSigningActive({ expiresAt: now, now })).toBeFalsy();
			expect(isWalletConnectUncheckedSigningActive({ expiresAt: now - 1, now })).toBeFalsy();
		});

		it('should be off when it was never turned on', () => {
			expect(isWalletConnectUncheckedSigningActive({ expiresAt: undefined, now })).toBeFalsy();
		});

		// Never a longer window: a stored moment further away than the switch lasts was not written by
		// turning it on, or the clock moved back since.
		it('should be off when the moment lies further away than the switch ever lasts', () => {
			expect(
				isWalletConnectUncheckedSigningActive({
					expiresAt: now + WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS + 1,
					now
				})
			).toBeFalsy();
		});
	});

	describe('isWalletConnectDomainFlagged', () => {
		const context = (verified: Partial<Verify.Context['verified']>): Verify.Context => ({
			verified: {
				origin: 'https://dapp.example',
				validation: 'VALID',
				verifyUrl: 'https://verify.walletconnect.org',
				...verified
			}
		});

		it('should flag a site WalletConnect marks as a scam', () => {
			expect(isWalletConnectDomainFlagged(context({ isScam: true }))).toBeTruthy();
		});

		it('should flag a site whose origin does not match the domain the app declares', () => {
			expect(isWalletConnectDomainFlagged(context({ validation: 'INVALID' }))).toBeTruthy();
		});

		it('should not flag a verified site', () => {
			expect(isWalletConnectDomainFlagged(context({ isScam: false }))).toBeFalsy();
		});

		it('should not flag a site the verification could not judge', () => {
			expect(isWalletConnectDomainFlagged(context({ validation: 'UNKNOWN' }))).toBeFalsy();
			expect(isWalletConnectDomainFlagged(undefined)).toBeFalsy();
		});
	});
});
