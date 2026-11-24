import { CYCLES_LEDGER_DECIMALS, CYCLES_TOP_UP_REFUND_FEES } from '$icp/constants/cmc.constants';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { isTokenIcp } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionBalance } from '$lib/types/balance';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkContacts } from '$lib/types/contacts';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import { formatToken } from '$lib/utils/format.utils';
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

/**
 * The contact addresses that are canister IDs, by the same rule as the canister input, one
 * entry per address. An ICP account identifier is never one, even a canister's: it is a
 * hash, which no canister ID can be read back from.
 */
export const getCanisterNetworkContacts = (contacts: ContactUi[]): NetworkContacts =>
	Object.entries(getNetworkContacts({ addressType: 'Icrcv2', contacts })).reduce<NetworkContacts>(
		(acc, [key, networkContact]) =>
			nonNullish(parseCanisterId(networkContact.address)) ? { ...acc, [key]: networkContact } : acc,
		{}
	);

/**
 * The canister an Activity top-up went to, when it can be told. A TCYCLES top-up names it.
 * An ICP top-up only names the CMC's deposit account for it, a hash no canister can be read
 * back from, so it is told only when a contact's canister pays into that account.
 */
export const getTopUpCanisterId = ({
	transaction: { typeLabel, to },
	cmcDepositAccountCanisterIds
}: {
	transaction: Pick<IcTransactionUi, 'typeLabel' | 'to'>;
	// The contacts' canister IDs by their CMC deposit account identifier, in lower case.
	cmcDepositAccountCanisterIds: Record<string, string>;
}): string | undefined => {
	if (typeLabel !== 'transaction.label.top_up' || isNullish(to)) {
		return;
	}

	return nonNullish(parseCanisterId(to)) ? to : cmcDepositAccountCanisterIds[to.toLowerCase()];
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

/**
 * Whether a token can pay for a top-up: its balance covers the fee and the smallest amount
 * the flow takes. A refund returns the amount minus its fees, so the flow only takes amounts
 * above them: the CMC's refund fees with ICP, the cycles ledger's fee with TCYCLES. A
 * balance that has not loaded counts as zero.
 */
export const isCyclesTopUpTokenUsable = ({
	token,
	balance
}: {
	token: IcToken;
	balance: OptionBalance;
}): boolean => {
	const { fee } = token;

	const refundFees = isTokenIcp(token) ? CYCLES_TOP_UP_REFUND_FEES : fee;

	return nonNullish(balance) && balance > refundFees + fee;
};

/**
 * The cycles a top-up of `amount` ICP e8s deposits at a CMC rate: the rate converts 1 e8
 * into exactly `xdrPermyriadPerIcp` cycles (`toCyclesPerIcp`), and unlike a mint, no
 * cycles ledger takes a fee. An estimate, because the CMC converts at its rate when the
 * notify runs.
 */
export const estimateCyclesTopUpCycles = ({
	amount,
	xdrPermyriadPerIcp
}: {
	amount: bigint;
	xdrPermyriadPerIcp: bigint;
}): bigint => amount * xdrPermyriadPerIcp;

// Cycles as trillions, the unit a top-up paid with ICP shows them in: "2.49" for the "2.49T
// cycles" a canister receives. Never TCYCLES, which is a token, and none is involved.
export const formatTrillionCycles = (cycles: bigint): string =>
	formatToken({
		value: cycles,
		unitName: CYCLES_LEDGER_DECIMALS,
		displayDecimals: CYCLES_LEDGER_DECIMALS
	});
