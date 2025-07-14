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
import { fromNullable, isEmptyString, isNullish, notEmptyString, toNullable } from '@dfinity/utils';

export interface SaveContactParams extends Omit<ContactUi, 'image'> {
	imageUrl?: string | null;
}

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
		image: image.length > 0 ? [image[0]!] : [],
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
}): string => `${address}-${contact.id.toString()}`;

const parseDataUrl = (dataUrl: string): { mime: string; data: Uint8Array } => {
	const [header, b64] = dataUrl.split(',');
	const mime = header.match(/data:(.*);base64/)?.[1]!;
	const bin = atob(b64);
	const arr = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) {
		arr[i] = bin.charCodeAt(i);
	}
	return { mime, data: arr };
};

export const dataUrlToContactImage = (dataUrl: string): ContactImage => {
	const { mime, data } = parseDataUrl(dataUrl);
	const subtype = mime.split('/')[1];
	const mimeType = { [`image/${subtype}`]: null } as ImageMimeType;
	return { mime_type: mimeType, data };
};

export const contactImageToDataUrl = (img: ContactImage): string => {
	const [mime] = Object.keys(img.mime_type);
	const b64 = btoa(String.fromCharCode(...img.data));
	return `data:${mime};base64,${b64}`;
};

export const saveContact = async (params: SaveContactParams): Promise<void> => {
	const { imageUrl, ...rest } = params;

	const contactUi: ContactUi = {
		...rest,
		image: imageUrl ? [dataUrlToContactImage(imageUrl)] : []
	};

	const beContact = mapToBackendContact(contactUi);
	const authClient = await AuthClient.create();
	const identity: Identity = await authClient.getIdentity();
	await apiUpdateContact({ contact: beContact, identity });
};
