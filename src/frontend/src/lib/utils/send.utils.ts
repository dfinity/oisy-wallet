import { isNullish } from '@dfinity/utils';

export const invalidDestination = (destination: string): boolean =>
	isNullish(destination) || destination === '';

export const invalidAmount = (amount: number | undefined): boolean =>
	isNullish(amount) || amount < 0;

export const isIcpAccountIdentifier = async (address: string | undefined): Promise<boolean> => {
	if (isNullish(address)) {
		return false;
	}

	try {
		const { checkAccountId } = await import('@dfinity/nns');
		checkAccountId(address);
		return true;
	} catch (_: unknown) {
		// We do not parse the error
	}

	return false;
};

export const mapAddressStartsWith0x = (address: string) => {
	const PREFIX = '0x' as const;

	if (address.startsWith(PREFIX)) {
		return address;
	}

	return `${PREFIX}${address}`;
};
