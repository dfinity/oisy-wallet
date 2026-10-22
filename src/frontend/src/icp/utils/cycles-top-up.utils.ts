import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { ZERO } from '$lib/constants/app.constants';
import { isNullish, nonNullish } from '@dfinity/utils';
import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';

// The class byte that ends an opaque principal, the kind every canister ID is. User
// principals, the anonymous principal and the management canister's empty ID end otherwise.
const OPAQUE_PRINCIPAL_CLASS = 0x01;

export const isCanisterId = (principal: Principal): boolean => {
	const bytes = principal.toUint8Array();

	return bytes.length > 0 && bytes[bytes.length - 1] === OPAQUE_PRINCIPAL_CLASS;
};

/**
 * The canister ID a text names, or `undefined` for anything else: text that is not a
 * principal, an account with a subaccount, an ICP account identifier, an address on another
 * network, or a principal that is not a canister's. The principal's checksum catches typos.
 */
export const parseCanisterId = (text: string): Principal | undefined => {
	let principal: Principal;

	try {
		principal = Principal.fromText(text.trim());
	} catch (_: unknown) {
		return undefined;
	}

	return isCanisterId(principal) ? principal : undefined;
};

/**
 * Whether an ICRC account, given as text, belongs to a canister, with or without a
 * subaccount.
 */
export const isCanisterAccount = (text: string): boolean => {
	try {
		return isCanisterId(decodeIcrcAccount(text.trim()).owner);
	} catch (_: unknown) {
		return false;
	}
};

export interface RecentlyToppedUpCanister {
	canisterId: string;
	// The newest top-up's amount, in cycles.
	value?: bigint;
	timestamp?: bigint;
}

/**
 * The canisters the loaded TCYCLES history shows top-ups to, newest first, each once, with
 * its newest top-up. Nothing is stored: what is not loaded is not listed.
 */
export const getRecentlyToppedUpCanisters = (
	transactions: IcTransactionUi[]
): RecentlyToppedUpCanister[] => {
	const newest = transactions.reduce<Record<string, RecentlyToppedUpCanister>>(
		(acc, { typeLabel, to, value, timestamp }) => {
			if (typeLabel !== 'transaction.label.top_up' || isNullish(to) || Array.isArray(to)) {
				return acc;
			}

			const known = acc[to];

			if (nonNullish(known) && (isNullish(timestamp) || (known.timestamp ?? ZERO) >= timestamp)) {
				return acc;
			}

			return { ...acc, [to]: { canisterId: to, value, timestamp } };
		},
		{}
	);

	return Object.values(newest).sort(({ timestamp: a = ZERO }, { timestamp: b = ZERO }) =>
		b > a ? 1 : b < a ? -1 : 0
	);
};
