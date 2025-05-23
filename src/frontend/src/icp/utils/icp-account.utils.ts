import type { Icrcv2AccountId } from '$declarations/backend/backend.did';
import { assertNever } from '$lib/types/utils';
import { AccountIdentifier, isIcpAccountIdentifier } from '@dfinity/ledger-icp';
import { decodeIcrcAccount, encodeIcrcAccount } from '@dfinity/ledger-icrc';
import type { Principal } from '@dfinity/principal';

export const getAccountIdentifier = (principal: Principal): AccountIdentifier =>
	AccountIdentifier.fromPrincipal({ principal, subAccount: undefined });

/**
 * Parses a string into an Icrcv2AccountId object
 * @param address The address string to parse
 * @returns The parsed Icrcv2AccountId or undefined if parsing fails
 */
export const parseIcpAccountId = (address: string): Icrcv2AccountId | undefined => {
	if (isIcpAccountIdentifier(address)) {
		return {
			Account: Buffer.from(address, 'hex')
		};
	}

	try {
		const decoded = decodeIcrcAccount(address);
		return {
			WithPrincipal: {
				owner: decoded.owner,
				subaccount: decoded.subaccount ? [decoded.subaccount] : []
			}
		};
	} catch (_: unknown) {
		return undefined;
	}
};

/**
 * Extracts the address string from an Icrcv2AccountId object
 * @param accountId The Icrcv2AccountId object
 * @returns The address string or undefined if extraction fails
 */
export const getIcpAccountIdString = (accountId: Icrcv2AccountId): string => {
	if ('Account' in accountId) {
		return Buffer.from(accountId.Account).toString('hex');
	}

	if ('WithPrincipal' in accountId) {
		const { owner, subaccount } = accountId.WithPrincipal;
		const subaccountArray = subaccount.length > 0 ? subaccount[0] : undefined;

		return encodeIcrcAccount({
			owner,
			subaccount: subaccountArray
		});
	}

	return assertNever({ variable: accountId, typeName: 'Icrcv2AccountId' });
};
