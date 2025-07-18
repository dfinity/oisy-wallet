import type { ContactAddressUi } from '$lib/types/contact';
import { compareTokenAccountIdTypes } from '$lib/utils/token-account-id.utils';
import { isEmptyString, notEmptyString } from '@dfinity/utils';

export const compareContactAddresses = ({
	a,
	b
}: {
	a: ContactAddressUi;
	b: ContactAddressUi;
}): number => {
	// First compare by network
	const networkCompare = compareTokenAccountIdTypes({ a: a.addressType, b: b.addressType });
	if (networkCompare !== 0) {
		return networkCompare;
	}

	// Then compare by alias (no alias comes last)
	const aliasA = a.label ?? '';
	const aliasB = b.label ?? '';

	// Special handling for empty aliases (they should come last)
	if (isEmptyString(aliasA) && notEmptyString(aliasB)) {
		return 1;
	}
	if (notEmptyString(aliasA) && isEmptyString(aliasB)) {
		return -1;
	}

	const aliasCompare = aliasA.localeCompare(aliasB);
	if (aliasCompare !== 0) {
		return aliasCompare;
	}

	// Finally compare by address
	return a.address.localeCompare(b.address);
};
