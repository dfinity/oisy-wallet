import type { ContactImage, ImageMimeType } from '$declarations/backend/backend.did';
import { updateContact as apiUpdateContact } from '$lib/api/backend.api';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { mapToBackendContact, mapToFrontendContact } from '$lib/utils/contact.utils';
import { AuthClient } from '@dfinity/auth-client';

export interface SaveContactParams extends Omit<ContactUi, 'image'> {
	image?: ContactImage;
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
