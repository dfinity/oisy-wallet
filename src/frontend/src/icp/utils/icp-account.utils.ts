import type { Icrcv2AccountId } from '$declarations/backend/declarations/backend.did';
import { assertNever, nonNullish } from '@dfinity/utils';
import {
	AccountIdentifier,
	SubAccount,
	isIcpAccountIdentifier
} from '@icp-sdk/canisters/ledger/icp';
import {
	decodeIcrcAccount,
	encodeIcrcAccount,
	fromCandidAccount,
	toCandidAccount
} from '@icp-sdk/canisters/ledger/icrc';
import type { Principal } from '@icp-sdk/core/principal';

export const getAccountIdentifier = (principal: Principal): AccountIdentifier =>
	AccountIdentifier.fromPrincipal({ principal, subAccount: undefined });

/**
 * Parses a string into an Icrcv2AccountId object
 * @param address The address string to parse
 * @returns The parsed Icrcv2AccountId or undefined if parsing fails
 */
export const parseIcrcv2AccountId = (address: string): Icrcv2AccountId | undefined => {
	if (isIcpAccountIdentifier(address)) {
		return {
			Account: Buffer.from(address, 'hex')
		};
	}

	try {
		const decoded = decodeIcrcAccount(address);
		return {
			WithPrincipal: toCandidAccount(decoded)
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
export const getIcrcv2AccountIdString = (accountId: Icrcv2AccountId): string => {
	if ('Account' in accountId) {
		return Buffer.from(accountId.Account).toString('hex');
	}

	if ('WithPrincipal' in accountId) {
		return encodeIcrcAccount(fromCandidAccount(accountId.WithPrincipal));
	}

	assertNever(accountId, `Unexpected Icrcv2AccountId: ${accountId}`);
};

/**
 * Tries to parse an Icrc-1 account string to AccountIdentifier text.
 * Used for generating account ID from a principal when opening "Contacts" tab in the send flow.
 * The goal - we to filter out account IDs from the list if the same contact has the matching Principal saved.
 * @param accountString A string that will be decoded into an Icrc-1 compatible account
 * @returns AccountIdentifier text equivalent of the provided accountString or undefined if parsing fails
 */
export const tryToParseIcrcAccountStringToAccountIdentifierText = (
	accountString: string
): string | undefined => {
	try {
		const { owner: principal, subaccount: icrcSubaccount } = decodeIcrcAccount(accountString);

		const subAccount = nonNullish(icrcSubaccount)
			? SubAccount.fromBytes(new Uint8Array(icrcSubaccount))
			: undefined;

		return AccountIdentifier.fromPrincipal({
			principal,
			subAccount
		}).toHex();
	} catch (_: unknown) {
		// if parsing failed, we just return undefined and let consumers handle it
	}
};
