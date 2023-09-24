import { isNullish } from '@dfinity/utils';

export const invalidIcpAddress = async (address: string | undefined): Promise<boolean> => {
	if (isNullish(address)) {
		return true;
	}

	try {
		const { checkAccountId } = await import('@dfinity/nns');
		checkAccountId(address);
		return false;
	} catch (_: unknown) {
		// We do not parse the error
	}

	return true;
};
