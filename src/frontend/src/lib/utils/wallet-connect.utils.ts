import { WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS } from '$lib/constants/wallet-connect.constants';
import { nonNullish } from '@dfinity/utils';
import type { Verify } from '@walletconnect/types';

/**
 * Whether a WalletConnect session proposal or request may be approved: not when WalletConnect's
 * Verify API flags the site it comes from as a scam.
 *
 * Verify states that verdict in `isScam` alone. `validation` only says whether the request came
 * from the domain the dApp claims, so a flagged site served from its own domain is still `VALID`.
 */
export const acceptedContext = (context: Verify.Context | undefined): boolean =>
	context?.verified.isScam !== true;

/**
 * Whether the Settings switch that allows signing the WalletConnect transactions OISY can't check is
 * on at `now`.
 *
 * A moment further away than the switch ever lasts is not one OISY stored, or the clock moved back
 * since it did, so it reads as off rather than as a longer window.
 */
export const isWalletConnectUncheckedSigningActive = ({
	expiresAt,
	now
}: {
	expiresAt: number | undefined;
	now: number;
}): boolean =>
	nonNullish(expiresAt) &&
	now < expiresAt &&
	expiresAt - now <= WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS;

/**
 * Whether WalletConnect's domain verification flags the site a request comes from: as a known scam,
 * or as running on an origin other than the domain the app declares. Either is reason enough to offer
 * no way past a refusal.
 */
export const isWalletConnectDomainFlagged = (context: Verify.Context | undefined): boolean =>
	!acceptedContext(context) || context?.verified.validation === 'INVALID';
