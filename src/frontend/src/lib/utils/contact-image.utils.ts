import type { ContactUi } from '$lib/types/contact';
import { mapToBackendContact, mapToFrontendContact } from '$lib/utils/contact.utils';
import type { ContactImage, ImageMimeType } from '$declarations/backend/backend.did';
import { updateContact as apiUpdateContact } from '$lib/api/backend.api';
import type { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { contactsStore } from '$lib/stores/contacts.store';

export interface SaveContactParams extends Omit<ContactUi, 'image'> {
	imageUrl?: string | null;
}

const parseDataUrl = (dataUrl: string): { mime: string; data: Uint8Array } => {
	const [header, b64] = dataUrl.split(',');

	const match = header.match(/data:(.*);base64/);
	if (!match) {
		throw new Error(`Invalid data URL: ${header}`);
	}
	const [, mime] = match;

	const bin = atob(b64);
	const arr = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) {
		arr[i] = bin.charCodeAt(i);
	}
	return { mime, data: arr };
};
export const dataUrlToImage = (dataUrl: string): ContactImage => {
	const { mime, data } = parseDataUrl(dataUrl);
	const mimeType = { [mime]: null } as ImageMimeType;
	return { mime_type: mimeType, data };
};

export const imageToDataUrl = (img: ContactImage): string => {
	const [mime] = Object.keys(img.mime_type);
	const b64 = btoa(String.fromCharCode(...img.data));
	return `data:${mime};base64,${b64}`;
};

export async function fileToContactImage(file: File): Promise<ContactImage> {
	const buf = await file.arrayBuffer();
	const data = new Uint8Array(buf);
	const mimeType = { [file.type]: null } as ImageMimeType;
	return { data, mime_type: mimeType };
  }

// export const saveContact = async (params: SaveContactParams): Promise<void> => {
// 	const { imageUrl, ...rest } = params;

// 	const contactUi: ContactUi = {
// 		...rest,
// 		image: imageUrl ? ([dataUrlToImage(imageUrl)] as [ContactImage]) : []
// 	};

// 	const beContact = mapToBackendContact(contactUi);
// 	const authClient = await AuthClient.create();
// 	const identity: Identity = await authClient.getIdentity();
// 	await apiUpdateContact({ contact: beContact, identity });
// };
export async function saveContact(params: SaveContactParams): Promise<ContactUi> {
	const { imageUrl, ...rest } = params;
  
	const contactUi: ContactUi = {
	  ...rest,
	  image: imageUrl ? ([dataUrlToImage(imageUrl)] as [ContactImage]) : []
	};
  
	const beContact = mapToBackendContact(contactUi);
	const authClient = await AuthClient.create();
	const identity = await authClient.getIdentity();
	const updatedBe = await apiUpdateContact({ contact: beContact, identity });
  
	const updatedUi = mapToFrontendContact(updatedBe);
	contactsStore.updateContact(updatedUi);
	return updatedUi;
  }