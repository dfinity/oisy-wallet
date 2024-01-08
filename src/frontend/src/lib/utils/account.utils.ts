import { checkAccountId } from '@dfinity/ledger-icp';
import { isNullish } from '@dfinity/utils';

export const isIcpAccountIdentifier = async (address: string | undefined): Promise<boolean> => {
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
