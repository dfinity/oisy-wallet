import { isNullish } from '@dfinity/utils';
import { isAddress } from 'ethers/address';

export const isEthAddress = (address: string | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	return isAddress(address);
};
