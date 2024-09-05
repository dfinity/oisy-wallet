import { AccountIdentifier } from '@dfinity/ledger-icp';
import type { Principal } from '@dfinity/principal';

export const getAccountIdentifier = (principal: Principal): AccountIdentifier =>
	AccountIdentifier.fromPrincipal({ principal, subAccount: undefined });
