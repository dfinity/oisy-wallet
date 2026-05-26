import { isSolAddress } from '$sol/utils/sol-address.utils';

export const isBareSolAddressCode = (code: string): boolean => isSolAddress(code.trim());
