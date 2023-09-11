import { isAddress } from '@ethersproject/address';

export const getSignParamsMessageHex = (params: string[]): string =>
	params.filter((p) => !isAddress(p))[0];
