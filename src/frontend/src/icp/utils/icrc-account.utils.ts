import { decodeIcrcAccount, type IcrcAccount } from '@dfinity/ledger-icrc';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { sha256 } from '@noble/hashes/sha256';

export const getIcrcAccount = (principal: Principal): IcrcAccount => ({ owner: principal });

/**
 * Creates a deterministic 32-byte subaccount from a principal
 * @param principal The principal to derive the subaccount from
 * @returns A 32-byte Uint8Array to be used as an ICRC subaccount
 */
export const getIcrcSubaccount = (principal: Principal): Uint8Array => {
	const principalBytes = principal.toUint8Array();
	return sha256(principalBytes);
};

export const isIcrcAddress = (address: string | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	try {
		decodeIcrcAccount(address);
		return true;
	} catch (_: unknown) {
		// We do not parse the error
	}

	return false;
};

export const invalidIcrcAddress = (address: string | undefined): boolean => !isIcrcAddress(address);
