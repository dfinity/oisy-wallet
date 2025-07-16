import type { ContactImage, ImageMimeType } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import {
	dataUrlToImage,
	fileToContactImage,
	imageToDataUrl,
	saveContact
} from '$lib/utils/contact-image.utils';
import { mapToBackendContact, mapToFrontendContact } from '$lib/utils/contact.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { AuthClient } from '@dfinity/auth-client';
import { vi } from 'vitest';

// ---- Mocks ----
vi.mock('@dfinity/auth-client');
vi.mock('$lib/api/backend.api');
vi.mock('$lib/stores/contacts.store');
vi.mock('$lib/utils/contact.utils');

describe('contact-image.utils', () => {
	const MOCK_BE_CONTACT = {
		id: 42n,
		name: 'Alice',
		update_timestamp_ns: 123n,
		addresses: [],
		image: [
			{
				data: new Uint8Array([1, 2, 3]),
				mime_type: { 'image/png': null } as ImageMimeType
			}
		] as [ContactImage]
	};
	const MOCK_UI_CONTACT: ContactUi = {
		id: MOCK_BE_CONTACT.id,
		name: MOCK_BE_CONTACT.name,
		updateTimestampNs: MOCK_BE_CONTACT.update_timestamp_ns,
		addresses: [],
		image: MOCK_BE_CONTACT.image
	};

	beforeEach(() => {
		vi.mocked(AuthClient.create).mockResolvedValue({
			getIdentity: () => mockIdentity
		} as AuthClient);

		vi.mocked(backendApi.updateContact).mockResolvedValue(MOCK_BE_CONTACT);

		vi.mocked(mapToBackendContact).mockImplementation((ui: ContactUi) => ({
			...MOCK_BE_CONTACT,
			name: ui.name,
			image: ui.image
		}));
		vi.mocked(mapToFrontendContact).mockReturnValue(MOCK_UI_CONTACT);

		vi.spyOn(contactsStore, 'updateContact').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('dataUrlToImage / imageToDataUrl', () => {
		const sampleDataUrl = `data:image/png;base64,${btoa(String.fromCharCode(10, 20, 30, 40))}`;

		it('throws if header is invalid', () => {
			expect(() => dataUrlToImage('not a valid url')).toThrow(/Invalid data URL/);
		});

		it('round-trips through base64 correctly', () => {
			const img = dataUrlToImage(sampleDataUrl);

			expect(img.mime_type).toEqual({ 'image/png': null });
			expect(img.data).toEqual(new Uint8Array([10, 20, 30, 40]));

			const back = imageToDataUrl(img);

			expect(back).toBe(sampleDataUrl);
		});
	});

	describe('fileToContactImage', () => {
		it('converts a File to ContactImage', async () => {
			const data = new Uint8Array([5, 6, 7, 8]);
			const blob = new Blob([data], { type: 'image/png' });

			const file = new File([blob], 'foo.png', { type: 'image/png' });
			file.arrayBuffer = vi.fn().mockResolvedValue(data.buffer);

			const img = await fileToContactImage(file);

			expect(img.mime_type).toEqual({ 'image/png': null });
			expect(img.data).toEqual(new Uint8Array([5, 6, 7, 8]));
			expect(file.arrayBuffer).toHaveBeenCalled();
		});
	});

	describe('saveContact', () => {
		it('updates the store and returns the UI contact', async () => {
			const returned = await saveContact({
				id: MOCK_UI_CONTACT.id,
				name: 'Alice',
				updateTimestampNs: MOCK_UI_CONTACT.updateTimestampNs,
				addresses: [],
				imageUrl: `data:image/gif;base64,${btoa('\x01')}`
			});

			expect(AuthClient.create).toHaveBeenCalled();
			expect(backendApi.updateContact).toHaveBeenCalledWith(
				expect.objectContaining({ contact: expect.any(Object), identity: mockIdentity })
			);
			expect(contactsStore.updateContact).toHaveBeenCalledWith(MOCK_UI_CONTACT);
			expect(returned).toBe(MOCK_UI_CONTACT);
		});

		it('sends an empty image array if imageUrl is null', async () => {
			await saveContact({
				id: MOCK_UI_CONTACT.id,
				name: 'Alice',
				updateTimestampNs: MOCK_UI_CONTACT.updateTimestampNs,
				addresses: [],
				imageUrl: null
			});

			const lastCall = vi.mocked(backendApi.updateContact).mock.calls[0][0].contact;

			expect(lastCall.image).toEqual([]);
		});
	});
});
