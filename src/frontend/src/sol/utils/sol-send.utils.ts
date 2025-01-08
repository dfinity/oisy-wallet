import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { invalidSolAddress } from '$sol/utils/sol-address.utils';

export const isInvalidDestinationSol = (destination: string): boolean => {
	if (isNullishOrEmpty(destination)) {
		return false;
	}

	return invalidSolAddress(destination);
};
