import { isIcpAccountIdentifier } from '$lib/utils/account.utils';

export const invalidIcpAddress = (address: string | undefined): boolean =>
	!isIcpAccountIdentifier(address);
