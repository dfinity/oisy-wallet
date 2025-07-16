import type { Contact, ContactImage, ImageMimeType } from '$declarations/backend/backend.did';
import { updateContact as apiUpdateContact } from '$lib/api/backend.api';
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
import type { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import {
	fromNullable,
	isEmptyString,
	isNullish,
	nonNullish,
	notEmptyString,
	toNullable
} from '@dfinity/utils';

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
		image: nonNullish(image[0]) ? ([image[0]] as [ContactImage]) : [],
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
		image: image ?? [],
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
	const result = TokenAccountIdSchema.safeParse(address);
	if (!result.success) {
		return;
	}
	const addressType = getDiscriminatorForTokenAccountId(result.data);
	if (isNullish(addressType)) {
		return;
	}

	return { address, addressType };
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
	(areAddressesPartiallyEqual({ address1: address, address2: filterValue, networkId }) ||
		contact.name.toLowerCase().includes(filterValue.toLowerCase()) ||
		contact.addresses.some(
			({ label, address: innerAddress }) =>
				areAddressesEqual({ address1: address, address2: innerAddress, networkId }) &&
				label?.toLowerCase().includes(filterValue.toLowerCase())
		));

export const filterAddressFromContact = <T extends Address>({
	contact,
	address: filterAddress
}: {
	contact: ContactUi | undefined;
	address: OptionAddress<T>;
}): ContactAddressUi | undefined =>
	contact?.addresses.find(({ address, addressType }) =>
		areAddressesEqual({ address1: address, address2: filterAddress, addressType })
	);

export const getNetworkContactKey = ({
	contact,
	address
}: {
	contact: ContactUi;
	address: Address;
}): string => `${address}-${contact.id.toString()}`;