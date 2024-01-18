import type { CkEthHelperContractAddressData } from '$eth/stores/cketh.store';
import { nonNullish } from '@dfinity/utils';

export const mapAddressStartsWith0x = (address: string) => {
	const PREFIX = '0x' as const;

	if (address.startsWith(PREFIX)) {
		return address;
	}

	return `${PREFIX}${address}`;
};

export const isCkEthHelperContract = ({
	helperContractAddress,
	destination
}: {
	helperContractAddress: CkEthHelperContractAddressData;
	destination: string | undefined;
}): boolean =>
	nonNullish(helperContractAddress) &&
	destination?.toLowerCase() === helperContractAddress.data.toLowerCase();
