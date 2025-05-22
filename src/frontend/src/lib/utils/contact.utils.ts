import type { Contact } from '$declarations/backend/backend.did';
import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import type { ContactUi } from '$lib/types/contact';
import type { NonEmptyArray } from '$lib/types/utils';
import {
	getAddressString,
	getDiscriminatorForTokenAccountId
} from '$lib/utils/token-account-id.utils';
import { fromNullable, isEmptyString, toNullable } from '@dfinity/utils';

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
	const { update_timestamp_ns, ...rest } = contact;
	return {
		...rest,
		updateTimestampNs: update_timestamp_ns,
		addresses: contact.addresses.map((address) => ({
			address: getAddressString(address.token_account_id),
			label: fromNullable(address.label),
			addressType: getDiscriminatorForTokenAccountId(address.token_account_id)
		}))
	};
};

export const mapToBackendContact = (contact: ContactUi): Contact => {
	const { updateTimestampNs, ...rest } = contact;
	return {
		...rest,
		update_timestamp_ns: updateTimestampNs,
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
	contactList.find((c) =>
		c.addresses.find((address) => address.address.toLowerCase() === addressString.toLowerCase())
	);
