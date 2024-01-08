import { decodeIcrcAccount, type IcrcAccount } from '@dfinity/ledger-icrc';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';

export const getIcrcAccount = (principal: Principal): IcrcAccount => ({ owner: principal });

export const invalidIcrcAddress = (address: string | undefined): boolean => {
	if (isNullish(address)) {
		return true;
	}

	try {
		decodeIcrcAccount(address);
		return false;
	} catch (_: unknown) {
		// We do not parse the error
	}

	return true;
};
