import type { ContactImage, ImageMimeType } from '$declarations/backend/backend.did';
import { isNullish } from '@dfinity/utils';

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

export const dataUrlToImage = (dataUrl: string | null): ContactImage | null => {
	if (isNullish(dataUrl)) {
		return null;
	}

	const { mime, data } = parseDataUrl(dataUrl);
	const mimeType = { [mime]: null } as ImageMimeType;
	return { mime_type: mimeType, data };
};

export const imageToDataUrl = (img: ContactImage | null): string | null => {
	if (isNullish(img)) {
		return null;
	}

	const [mime] = Object.keys(img.mime_type);
	const b64 = btoa(String.fromCharCode(...img.data));
	return `data:${mime};base64,${b64}`;
};
