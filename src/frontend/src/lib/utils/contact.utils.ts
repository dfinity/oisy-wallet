import type { Contact } from '$declarations/backend/backend.did';
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
import { fromNullable, isEmptyString, isNullish, notEmptyString, toNullable } from '@dfinity/utils';

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

export const filterAddressFromContact = <T extends Address>({
	contact,
	address: filterAddress
}: {
	contact: ContactUi | undefined;
	address: OptionAddress<T>;
}): ContactAddressUi | undefined =>
	contact?.addresses.find(({ address, addressType }) =>
		areAddressesEqual({
			address1: address,
			address2: filterAddress,
			addressType
		})
	);

export const getNetworkContactKey = ({
	contact,
	address
}: {
	contact: ContactUi;
	address: Address;
}) => `${address}-${contact.id.toString()}`;
