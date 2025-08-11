import type { ContactImage } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { createContact, loadContacts, updateContact } from '$lib/services/manage-contacts.service';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import {
	mockBackendContactAddressBtc,
	mockBackendContactAddressEth,
	mockBackendContactAddressSol
} from '$tests/mocks/contacts.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const mockContactImage: ContactImage | null = {
	data: new Uint8Array([1, 2, 3]),
	mime_type: { 'image/png': null }
};

describe('manage-contacts.service', () => {
	describe('loadContacts', () => {
		// Mock the getContacts function from backend.api
		const mockGetContacts = vi.spyOn(backendApi, 'getContacts');

		beforeEach(() => {
			vi.resetAllMocks();
			contactsStore.reset();
		});

		it('should load contacts with sorted addresses', async () => {
			// Create mock contacts with unsorted addresses
			const mockContacts = [
				{
					id: BigInt(1),
					name: 'Test Contact',
					update_timestamp_ns: BigInt(Date.now()),
					addresses: [
						mockBackendContactAddressSol, // Sol should come last
						mockBackendContactAddressBtc, // Btc should come first
						mockBackendContactAddressEth // Eth should come second
					],
					image: [] as []
				}
			];

			// Mock the getContacts function to return our mock contacts
			mockGetContacts.mockResolvedValue(mockContacts);

			// Call loadContacts
			await loadContacts(mockIdentity);

			// Get the contacts from the store
			const loadedContacts = get(contactsStore);

			// Verify that contacts were loaded
			expect(loadedContacts).toHaveLength(1);

			const [contact] = loadedContacts ?? [];

			expect(contact.name).toBe('Test Contact');

			// Verify that addresses are sorted correctly
			const { addresses } = contact;

			// Check that addresses are in the correct order
			expect(addresses[0].addressType).toBe('Btc');
			expect(addresses[1].addressType).toBe('Eth');
			expect(addresses[2].addressType).toBe('Sol');
		});

		it('should handle contacts with empty addresses array', async () => {
			// Create mock contacts with empty addresses array
			const mockContacts = [
				{
					id: BigInt(1),
					name: 'Empty Contact',
					update_timestamp_ns: BigInt(Date.now()),
					addresses: [],
					image: [] as []
				}
			];

			// Mock the getContacts function to return our mock contacts
			mockGetContacts.mockResolvedValue(mockContacts);

			// Call loadContacts
			await loadContacts(mockIdentity);

			// Get the contacts from the store
			const loadedContacts = get(contactsStore);

			// Verify that contacts were loaded
			expect(loadedContacts).toHaveLength(1);

			const [contact] = loadedContacts ?? [];

			expect(contact.name).toBe('Empty Contact');

			// Verify that addresses array is empty
			expect(contact.addresses).toHaveLength(0);
		});
	});

	describe('createContact', () => {
		const mockCreateContact = vi.spyOn(backendApi, 'createContact');

		beforeEach(() => {
			vi.resetAllMocks();
			contactsStore.reset();
		});

		it('should create a new contact', async () => {
			const mockNewContact = {
				id: BigInt(1),
				name: 'New Contact',
				update_timestamp_ns: BigInt(Date.now()),
				addresses: [],
				image: toNullable(mockContactImage)
			};

			mockCreateContact.mockResolvedValue(mockNewContact);

			const result = await createContact({
				name: 'New Contact',
				identity: mockIdentity
			});

			expect(mockCreateContact).toHaveBeenCalled();
			expect(result.name).toBe('New Contact');
		});
	});

	describe('updateContact', () => {
		const mockUpdateContact = vi.spyOn(backendApi, 'updateContact');
		let updateContactSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			vi.resetAllMocks();
			contactsStore.reset();

			updateContactSpy = vi.spyOn(contactsStore, 'updateContact');
		});

		it('should update contact with image', async () => {
			const mockUpdatedContact = {
				id: BigInt(1),
				name: 'Updated Contact',
				update_timestamp_ns: BigInt(Date.now()),
				addresses: [],
				image: toNullable(mockContactImage)
			};

			mockUpdateContact.mockResolvedValue(mockUpdatedContact);

			const contact: ContactUi = {
				id: BigInt(1),
				name: 'Updated Contact',
				updateTimestampNs: BigInt(Date.now()),
				addresses: []
			};

			const result = await updateContact({
				contact,
				identity: mockIdentity,
				image: mockContactImage
			});

			expect(mockUpdateContact).toHaveBeenCalledOnce();
			expect(updateContactSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					image: mockContactImage
				})
			);
			expect(result.image).toEqual(mockContactImage);
		});

		it('should remove image when null is provided', async () => {
			const mockUpdatedContact = {
				id: BigInt(1),
				name: 'No Image Contact',
				update_timestamp_ns: BigInt(Date.now()),
				addresses: [],
				image: toNullable() as []
			};

			mockUpdateContact.mockResolvedValue(mockUpdatedContact);

			const contact: ContactUi = {
				id: BigInt(1),
				name: 'No Image Contact',
				updateTimestampNs: BigInt(Date.now()),
				addresses: [],
				image: mockContactImage
			};

			const result = await updateContact({
				contact,
				identity: mockIdentity,
				image: null
			});

			expect(mockUpdateContact).toHaveBeenCalledWith(
				expect.objectContaining({
					contact: expect.objectContaining({
						image: toNullable(null)
					})
				})
			);
			expect(result.image).toBeUndefined();
		});

		it('should maintain existing image when undefined is provided', async () => {
			const existingContact: ContactUi = {
				id: BigInt(1),
				name: 'Existing Contact',
				updateTimestampNs: BigInt(Date.now()),
				addresses: [],
				image: mockContactImage
			};

			contactsStore.set([existingContact]);

			const mockUpdatedContact = {
				id: BigInt(1),
				name: 'Existing Contact',
				update_timestamp_ns: BigInt(Date.now()),
				addresses: [],
				image: toNullable(mockContactImage)
			};

			mockUpdateContact.mockResolvedValue(mockUpdatedContact);

			const result = await updateContact({
				contact: existingContact,
				identity: mockIdentity
			});

			expect(result.image).toEqual(mockContactImage);
		});
	});
});
