import { AccountIdentifier, checkAccountId } from '@dfinity/ledger-icp';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';

export const getAccountIdentifier = (principal: Principal): AccountIdentifier =>
	AccountIdentifier.fromPrincipal({ principal, subAccount: undefined });

export const invalidIcpAddress = (address: string | undefined): boolean => {
	if (isNullish(address)) {
		return true;
	}

	try {
		checkAccountId(address);
		return false;
	} catch (_: unknown) {
		// We do not parse the error
	}

	return true;
};
