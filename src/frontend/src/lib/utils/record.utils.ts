import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import { getCaseSensitiveness } from '$lib/utils/address.utils';

export const getRecordValueByCaseSensitivity = <T extends Address, R>({
	record,
	address,
	networkId
}: {
	record: Record<T, R>;
	address: T;
	networkId: NetworkId;
}): R | undefined => {
	const isCaseSensitive = getCaseSensitiveness({ networkId });

	if (isCaseSensitive) {
		return record[address];
	}

	const lowerCaseRecord = Object.fromEntries(
		Object.entries(record).map(([k, v]) => [k.toLowerCase(), v])
	) as Record<T, R>;

	return lowerCaseRecord[address.toLowerCase() as T];
};
