import type { ContactAddressData, ContactImage } from '$declarations/backend/backend.did';
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

const mockContactImage: ContactImage = {
	data: new Uint8Array([1, 2, 3]),
	mime_type: { 'image/png': null }
};

describe('manage-contacts.service', () => {
	describe('loadContacts', () => {
		const mockGetContactsPage = vi.spyOn(backendApi, 'getContactsPage');
		const mockGetContactImages = vi.spyOn(backendApi, 'getContactImages');

		const contactWith = ({
			id,
			addresses = []
		}: {
			id: bigint;
			addresses?: ContactAddressData[];
		}) => ({
			id,
			name: `Contact ${id}`,
			update_timestamp_ns: 1n,
			addresses,
			image: [] as []
		});

		const page = ({
			contacts,
			next
		}: {
			contacts: ReturnType<typeof contactWith>[];
			next?: bigint;
		}) => ({
			contacts,
			next: toNullable(next)
		});

		const imageEntry = (contactId: bigint) => ({ contact_id: contactId, image: mockContactImage });

		beforeEach(() => {
			vi.resetAllMocks();
			contactsStore.reset();

			mockGetContactImages.mockResolvedValue([]);
		});

		it('should load contacts with sorted addresses', async () => {
			mockGetContactsPage.mockResolvedValue(
				page({
					contacts: [
						contactWith({
							id: 1n,
							addresses: [
								mockBackendContactAddressSol,
								mockBackendContactAddressBtc,
								mockBackendContactAddressEth
							]
						})
					]
				})
			);

			await loadContacts(mockIdentity);

			const [contact] = get(contactsStore) ?? [];

			expect(contact.addresses.map(({ addressType }) => addressType)).toEqual([
				'Btc',
				'Eth',
				'Sol'
			]);
		});

		it('should handle contacts with empty addresses array', async () => {
			mockGetContactsPage.mockResolvedValue(page({ contacts: [contactWith({ id: 1n })] }));

			await loadContacts(mockIdentity);

			const [contact] = get(contactsStore) ?? [];

			expect(contact.addresses).toHaveLength(0);
		});

		it('should load every page, passing the cursor of the previous one', async () => {
			mockGetContactsPage
				.mockResolvedValueOnce(
					page({ contacts: [contactWith({ id: 1n }), contactWith({ id: 2n })], next: 2n })
				)
				.mockResolvedValueOnce(page({ contacts: [contactWith({ id: 3n })] }));

			await loadContacts(mockIdentity);

			expect(mockGetContactsPage).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				after: undefined
			});
			expect(mockGetContactsPage).toHaveBeenNthCalledWith(2, { identity: mockIdentity, after: 2n });
			expect(get(contactsStore)?.map(({ id }) => id)).toEqual([1n, 2n, 3n]);
		});

		describe('images', () => {
			const contacts = Array.from({ length: 20 }, (_, index) =>
				contactWith({ id: BigInt(index + 1) })
			);

			let spyTrackEvent: MockInstance<typeof analytics.trackEvent>;

			beforeEach(() => {
				spyTrackEvent = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => {});
				vi.spyOn(toastsStore, 'toastsError').mockReturnValue(Symbol('toast'));

				mockGetContactsPage.mockResolvedValue(page({ contacts }));
			});

			const imageOf = (id: bigint) =>
				get(contactsStore)?.find((contact) => contact.id === id)?.image;

			it('should load the images in batches of 16 and add them to their contacts', async () => {
				mockGetContactImages
					.mockResolvedValueOnce([imageEntry(1n)])
					.mockResolvedValueOnce([imageEntry(17n)]);

				await loadContacts(mockIdentity);

				expect(mockGetContactImages).toHaveBeenCalledTimes(2);
				expect(mockGetContactImages).toHaveBeenNthCalledWith(1, {
					identity: mockIdentity,
					contactIds: contacts.slice(0, 16).map(({ id }) => id)
				});
				expect(mockGetContactImages).toHaveBeenNthCalledWith(2, {
					identity: mockIdentity,
					contactIds: contacts.slice(16).map(({ id }) => id)
				});

				expect(imageOf(1n)).toEqual(mockContactImage);
				expect(imageOf(17n)).toEqual(mockContactImage);
				// Known to have no image.
				expect(imageOf(2n)).toBeNull();
				expect(spyTrackEvent).not.toHaveBeenCalled();
			});

			it('should keep the contacts and track a warn once when an image batch fails', async () => {
				mockGetContactImages
					.mockResolvedValueOnce([imageEntry(1n)])
					.mockRejectedValueOnce(new Error('Failed to fetch'));

				await loadContacts(mockIdentity);

				expect(get(contactsStore)).toHaveLength(20);
				expect(imageOf(1n)).toEqual(mockContactImage);
				// Not loaded: `updateContact` reads it before writing.
				expect(imageOf(17n)).toBeUndefined();
				expect(spyTrackEvent).toHaveBeenCalledExactlyOnceWith({
					name: 'contact',
					metadata: {
						event_context: 'contacts',
						event_modifier: 'load_images',
						result_status: 'error',
						event_severity: 'warn',
						result_error_type: 'unknown'
					}
				});
			});

			it('should leave a contact edited while its image loads as it is', async () => {
				const editedImage: ContactImage = {
					data: new Uint8Array([9]),
					mime_type: { 'image/png': null }
				};

				let resolveImages: (entries: ReturnType<typeof imageEntry>[]) => void = () => {};
				mockGetContactImages.mockReturnValueOnce(
					new Promise((resolve) => {
						resolveImages = resolve;
					})
				);

				const promise = loadContacts(mockIdentity);

				await vi.waitFor(() => expect(get(contactsStore)).toHaveLength(20));

				const contact = get(contactsStore)?.find(({ id }) => id === 1n);
				contactsStore.updateContact({ ...(contact as ContactUi), image: editedImage });

				resolveImages([imageEntry(1n)]);
				await promise;

				expect(imageOf(1n)).toEqual(editedImage);
			});
		});

		describe('retries', () => {
			const mockContacts = [contactWith({ id: 1n, addresses: [mockBackendContactAddressBtc] })];

			// Shaped like the agent's rejected query: its HTTP details carry the request, with the sender.
			const mockError = (() => {
				const code = new UncertifiedRejectErrorCode(
					requestIdOf({ method_name: 'get_contacts_page' }),
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
					methodName: 'get_contacts_page',
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
				mockGetContactsPage.mockResolvedValue(page({ contacts: mockContacts }));

				await loadContacts(mockIdentity);

				expect(mockGetContactsPage).toHaveBeenCalledOnce();
				expect(get(contactsStore)).toHaveLength(1);
				expect(spyTrackEvent).not.toHaveBeenCalled();
				expect(spyToastsError).not.toHaveBeenCalled();
			});

			it('should retry after 2 s and track a warn when the retry loads the contacts', async () => {
				mockGetContactsPage
					.mockRejectedValueOnce(mockError)
					.mockResolvedValueOnce(page({ contacts: mockContacts }));

				const promise = loadContacts(mockIdentity);

				await vi.advanceTimersByTimeAsync(1_999);

				expect(mockGetContactsPage).toHaveBeenCalledOnce();
				expect(get(contactsStore)).toBeUndefined();

				await vi.advanceTimersByTimeAsync(1);
				await promise;

				expect(mockGetContactsPage).toHaveBeenCalledTimes(2);
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
				mockGetContactsPage.mockRejectedValue(mockError);

				const promise = loadContacts(mockIdentity);

				await vi.advanceTimersByTimeAsync(2_000);

				expect(mockGetContactsPage).toHaveBeenCalledTimes(2);

				await vi.advanceTimersByTimeAsync(3_999);

				expect(mockGetContactsPage).toHaveBeenCalledTimes(2);

				await vi.advanceTimersByTimeAsync(1);
				await promise;

				expect(mockGetContactsPage).toHaveBeenCalledTimes(3);

				await vi.advanceTimersByTimeAsync(60_000);

				expect(mockGetContactsPage).toHaveBeenCalledTimes(3);
			});

			it('should leave the store unset and toast and track the failure once', async () => {
				mockGetContactsPage.mockRejectedValue(mockError);

				const promise = loadContacts(mockIdentity);

				await vi.runAllTimersAsync();
				await promise;

				expect(get(contactsStore)).toBeUndefined();
				expect(mockGetContactImages).not.toHaveBeenCalled();
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

				mockGetContactsPage.mockRejectedValue(mockError);

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
			expect(result.image).toBeNull();
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

		describe('when the image has not loaded yet', () => {
			const mockGetContactImages = vi.spyOn(backendApi, 'getContactImages');

			const contact: ContactUi = {
				id: BigInt(1),
				name: 'Contact',
				updateTimestampNs: BigInt(Date.now()),
				addresses: []
			};

			const updatedContact = {
				id: BigInt(1),
				name: 'Contact',
				update_timestamp_ns: BigInt(Date.now()),
				addresses: [],
				image: toNullable(mockContactImage)
			};

			it('should read the image first and write it back', async () => {
				mockGetContactImages.mockResolvedValue([{ contact_id: 1n, image: mockContactImage }]);
				mockUpdateContact.mockResolvedValue(updatedContact);

				await updateContact({ contact, identity: mockIdentity });

				expect(mockGetContactImages).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					contactIds: [1n]
				});
				expect(mockUpdateContact).toHaveBeenCalledWith(
					expect.objectContaining({
						contact: expect.objectContaining({ image: toNullable(mockContactImage) })
					})
				);
			});

			it('should write no image when the contact has none', async () => {
				mockGetContactImages.mockResolvedValue([]);
				mockUpdateContact.mockResolvedValue({ ...updatedContact, image: toNullable() as [] });

				await updateContact({ contact, identity: mockIdentity });

				expect(mockUpdateContact).toHaveBeenCalledWith(
					expect.objectContaining({
						contact: expect.objectContaining({ image: toNullable(null) })
					})
				);
			});

			it('should not write when the image cannot be read', async () => {
				const error = new Error('Failed to fetch');
				mockGetContactImages.mockRejectedValue(error);

				await expect(updateContact({ contact, identity: mockIdentity })).rejects.toThrow(error);

				expect(mockUpdateContact).not.toHaveBeenCalled();
			});
		});
	});
});
