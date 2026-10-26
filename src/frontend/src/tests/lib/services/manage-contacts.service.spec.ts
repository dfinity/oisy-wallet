import type { ContactImage } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import * as analytics from '$lib/services/analytics.services';
import { createContact, loadContacts, updateContact } from '$lib/services/manage-contacts.service';
import { contactsStore } from '$lib/stores/contacts.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { ContactUi } from '$lib/types/contact';
import {
	mockBackendContactAddressBtc,
	mockBackendContactAddressEth,
	mockBackendContactAddressSol
} from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import {
	RejectError,
	ReplicaRejectCode,
	UncertifiedRejectErrorCode,
	requestIdOf
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

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

		describe('retries', () => {
			const mockContacts = [
				{
					id: BigInt(1),
					name: 'Test Contact',
					update_timestamp_ns: BigInt(Date.now()),
					addresses: [mockBackendContactAddressBtc],
					image: [] as []
				}
			];

			// Shaped like the agent's rejected query: its HTTP details carry the request, with the sender.
			const mockError = (() => {
				const code = new UncertifiedRejectErrorCode(
					requestIdOf({ method_name: 'get_contacts' }),
					ReplicaRejectCode.CanisterError,
					'Canister is stopped',
					'IC0508',
					undefined
				);
				const httpDetails = {
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: [],
					requestDetails: { request_type: 'query', sender: mockPrincipal }
				};
				code.callContext = {
					canisterId: Principal.fromText('doked-biaaa-aaaar-qag2a-cai'),
					methodName: 'get_contacts',
					httpDetails
				};
				return RejectError.fromCode(code);
			})();

			let spyTrackEvent: MockInstance<typeof analytics.trackEvent>;
			let spyToastsError: MockInstance<typeof toastsStore.toastsError>;

			beforeEach(() => {
				vi.useFakeTimers();

				spyTrackEvent = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => {});
				spyToastsError = vi.spyOn(toastsStore, 'toastsError').mockReturnValue(Symbol('toast'));
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('should neither track nor toast when the first attempt loads the contacts', async () => {
				mockGetContacts.mockResolvedValue(mockContacts);

				await loadContacts(mockIdentity);

				expect(mockGetContacts).toHaveBeenCalledOnce();
				expect(get(contactsStore)).toHaveLength(1);
				expect(spyTrackEvent).not.toHaveBeenCalled();
				expect(spyToastsError).not.toHaveBeenCalled();
			});

			it('should retry after 2 s and track a warn when the retry loads the contacts', async () => {
				mockGetContacts.mockRejectedValueOnce(mockError).mockResolvedValueOnce(mockContacts);

				const promise = loadContacts(mockIdentity);

				await vi.advanceTimersByTimeAsync(1_999);

				expect(mockGetContacts).toHaveBeenCalledOnce();
				expect(get(contactsStore)).toBeUndefined();

				await vi.advanceTimersByTimeAsync(1);
				await promise;

				expect(mockGetContacts).toHaveBeenCalledTimes(2);
				expect(get(contactsStore)).toHaveLength(1);
				expect(spyTrackEvent).toHaveBeenCalledExactlyOnceWith({
					name: 'contact',
					metadata: {
						event_context: 'contacts',
						event_modifier: 'load_all',
						result_status: 'success',
						event_severity: 'warn'
					}
				});
				expect(spyToastsError).not.toHaveBeenCalled();
			});

			it('should give up after the third attempt, waiting 2 s and then 4 s', async () => {
				mockGetContacts.mockRejectedValue(mockError);

				const promise = loadContacts(mockIdentity);

				await vi.advanceTimersByTimeAsync(2_000);

				expect(mockGetContacts).toHaveBeenCalledTimes(2);

				await vi.advanceTimersByTimeAsync(3_999);

				expect(mockGetContacts).toHaveBeenCalledTimes(2);

				await vi.advanceTimersByTimeAsync(1);
				await promise;

				expect(mockGetContacts).toHaveBeenCalledTimes(3);

				await vi.advanceTimersByTimeAsync(60_000);

				expect(mockGetContacts).toHaveBeenCalledTimes(3);
			});

			it('should leave the store unset and toast and track the failure once', async () => {
				mockGetContacts.mockRejectedValue(mockError);

				const promise = loadContacts(mockIdentity);

				await vi.runAllTimersAsync();
				await promise;

				expect(get(contactsStore)).toBeUndefined();
				expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.contact.error.load },
					err: mockError
				});
				expect(spyTrackEvent).toHaveBeenCalledExactlyOnceWith({
					name: 'contact',
					metadata: {
						event_context: 'contacts',
						event_modifier: 'load_all',
						result_status: 'error',
						event_severity: 'error',
						result_error_type: 'call_rejected'
					}
				});
			});

			it('should track the error category, never the error text with its sender', async () => {
				expect(mockError.message).toContain(mockPrincipal.toText());

				mockGetContacts.mockRejectedValue(mockError);

				const promise = loadContacts(mockIdentity);

				await vi.runAllTimersAsync();
				await promise;

				const [[{ metadata }]] = spyTrackEvent.mock.calls;

				expect(metadata).not.toHaveProperty('result_error');
				expect(Object.values(metadata ?? {}).join(' ')).not.toContain(mockPrincipal.toText());
			});
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
		let updateContactSpy: MockInstance;

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
