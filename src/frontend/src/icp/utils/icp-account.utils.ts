import { isIcpAccountIdentifier } from '$lib/utils/account.utils';
import { AccountIdentifier } from '@dfinity/ledger-icp';
import type { Principal } from '@dfinity/principal';

export const getAccountIdentifier = (principal: Principal): AccountIdentifier =>
	AccountIdentifier.fromPrincipal({ principal, subAccount: undefined });

export const invalidIcpAddress = (address: string | undefined): boolean =>
	!isIcpAccountIdentifier(address);
