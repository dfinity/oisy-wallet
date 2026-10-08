import type { Contact } from '$declarations/backend/backend.did';
import { tryToParseIcrcAccountStringToAccountIdentifierText } from '$icp/utils/icp-account.utils';
import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import type { Address, OptionAddress } from '$lib/types/address';
import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
import type { NetworkId } from '$lib/types/network';
import type { NonEmptyArray } from '$lib/types/utils';
import { areAddressesEqual, areAddressesPartiallyEqual } from '$lib/utils/address.utils';
import {
	getDiscriminatorForTokenAccountId,
	getTokenAccountIdAddressString
} from '$lib/utils/token-account-id.utils';
import {
	fromNullable,
	isEmptyString,
	isNullish,
	nonNullish,
	notEmptyString,
	toNullable
} from '@dfinity/utils';
import { isIcpAccountIdentifier } from '@icp-sdk/canisters/ledger/icp';

export const selectColorForName = <T>({
	colors,
	name
}: {
	colors: NonEmptyArray<T>;
	name: string | undefined;
}): T | undefined => {
	const trimmedName = name?.trim?.();
	if (isEmptyString(trimmedName)) {
		return undefined;
	}

	const hash = [...trimmedName].reduce<number>(
		(acc, char) => (acc + char.charCodeAt(0)) % colors.length,
		0
	);

	return colors[hash];
};

export const mapToFrontendContact = (contact: Contact): ContactUi => {
	const { update_timestamp_ns, image, ...rest } = contact;
	return {
		...rest,
		updateTimestampNs: update_timestamp_ns,
		image: fromNullable(image),
		addresses: contact.addresses.map((address) => ({
			address: getTokenAccountIdAddressString(address.token_account_id),
			label: fromNullable(address.label),
			addressType: getDiscriminatorForTokenAccountId(address.token_account_id)
		}))
	};
};

export const mapToBackendContact = (contact: ContactUi): Contact => {
	const { updateTimestampNs, image, ...rest } = contact;
	return {
		...rest,
		update_timestamp_ns: updateTimestampNs,
		// null is an acceptable value — it means the user forcibly removed their avatar
		image: image !== undefined ? toNullable(image) : [],
		addresses: contact.addresses.map((address) => ({
			token_account_id: TokenAccountIdSchema.parse(address.address),
			label: toNullable(address.label)
		}))
	};
};

export const getContactForAddress = ({
	addressString,
	contactList
}: {
	addressString: string;
	contactList: ContactUi[];
}): ContactUi | undefined =>
	contactList.find((c) => filterAddressFromContact({ contact: c, address: addressString }));

export const mapAddressToContactAddressUi = (address: Address): ContactAddressUi | undefined => {
	const tokenAccountIdParseResult = TokenAccountIdSchema.safeParse(address);
	const currentAddressType = tokenAccountIdParseResult?.success
		? getDiscriminatorForTokenAccountId(tokenAccountIdParseResult.data)
		: undefined;

	if (isNullish(currentAddressType)) {
		return;
	}

	return {
		address,
		addressType: currentAddressType
	};
};

export const isContactMatchingFilter = ({
	address,
	contact,
	filterValue,
	networkId
}: {
	address: Address;
	contact: ContactUi;
	filterValue: string;
	networkId: NetworkId;
}): boolean =>
	notEmptyString(filterValue) &&
	(areAddressesPartiallyEqual({
		address1: address,
		address2: filterValue,
		networkId
	}) ||
		contact.name.toLowerCase().includes(filterValue.toLowerCase()) ||
		contact.addresses.some(
			({ label, address: innerAddress }) =>
				areAddressesEqual({
					address1: address,
					address2: innerAddress,
					networkId
				}) && label?.toLowerCase().includes(filterValue.toLowerCase())
		));

/**
 * Normalises an ICP address (hex account identifier or ICRC-1 account string,
 * i.e. principal text with an optional subaccount) to its canonical lowercase
 * hex account identifier form. Returns undefined for non-ICP addresses.
 */
const normalizeToIcpAccountIdentifierHex = (address: string): string | undefined => {
	if (isIcpAccountIdentifier(address)) {
		return address.toLowerCase();
	}

	const derived = tryToParseIcrcAccountStringToAccountIdentifierText(address);

	if (nonNullish(derived)) {
		return derived.toLowerCase();
	}
};

export const filterAddressFromContact = <T extends Address>({
	contact,
	address: filterAddress
}: {
	contact: ContactUi | undefined;
	address: OptionAddress<T>;
}): ContactAddressUi | undefined => {
	if (isNullish(contact) || isNullish(filterAddress)) {
		return;
	}

	const directMatch = contact.addresses.find(({ address, addressType }) =>
		areAddressesEqual({
			address1: address,
			address2: filterAddress,
			addressType
		})
	);

	if (nonNullish(directMatch)) {
		return directMatch;
	}

	const normalizedInput = normalizeToIcpAccountIdentifierHex(filterAddress);

	if (isNullish(normalizedInput)) {
		return;
	}

	return contact.addresses.find(
		({ addressType, address }) =>
			addressType === 'Icrcv2' && normalizeToIcpAccountIdentifierHex(address) === normalizedInput
	);
};

export const getNetworkContactKey = ({
	contact,
	address
}: {
	contact: ContactUi;
	address: Address;
}) => `${address}-${contact.id.toString()}`;

/**
 * Free-text search predicate for contact pickers. Returns `true` when `query`
 * matches the contact's name, any address label, any address as a case-
 * insensitive substring, or resolves to one of the contact's addresses via
 * {@link filterAddressFromContact} — so an ICRC-2 principal still matches a
 * contact saved by its derived ICP account-id hex, and vice versa.
 *
 * An empty `query` matches every contact (use this directly inside `Array.filter`
 * without short-circuiting at the call site).
 */
export const matchesContactByText = ({
	contact,
	query
}: {
	contact: ContactUi;
	query: string;
}): boolean => {
	if (query.length === 0) {
		return true;
	}

	const needle = query.toLowerCase();

	if (contact.name.toLowerCase().includes(needle)) {
		return true;
	}

	if (
		contact.addresses.some(
			({ address, label }) =>
				address.toLowerCase().includes(needle) ||
				(nonNullish(label) && label.toLowerCase().includes(needle))
		)
	) {
		return true;
	}

	return nonNullish(filterAddressFromContact({ contact, address: query }));
};
