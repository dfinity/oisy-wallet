import * as backendApi from '$lib/api/backend.api';
import { loadContacts } from '$lib/services/manage-contacts.service';
import { contactsStore } from '$lib/stores/contacts.store';
import {
	mockBackendContactAddressBtc,
	mockBackendContactAddressEth,
	mockBackendContactAddressSol
} from '$tests/mocks/contacts.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import { vi } from 'vitest';

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
					image: []
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
					addresses: []
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
});
