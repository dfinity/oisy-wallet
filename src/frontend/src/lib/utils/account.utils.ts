import { checkAccountId } from '@dfinity/ledger-icp';
import { isNullish } from '@dfinity/utils';
import { isAddress } from 'ethers/address';

export const isIcpAccountIdentifier = (address: string | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	try {
		checkAccountId(address);
		return true;
	} catch (_: unknown) {
		// We do not parse the error
	}

	return false;
};

export const isEthAddress = (address: string | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	return isAddress(address);
};

export const invalidIcpAddress = (address: string | undefined): boolean =>
	!isIcpAccountIdentifier(address);
