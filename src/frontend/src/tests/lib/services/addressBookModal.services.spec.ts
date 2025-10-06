import type { ContactImage } from '$declarations/backend/backend.did';
import { AddressBookSteps } from '$lib/enums/progress-steps';
import { makeController, type AddressBookDeps } from '$lib/services/addressBookModal.services';
import {
	currentAddressIndex,
	currentContactId,
	loading,
	qrCodeAddress
} from '$lib/stores/addressBookModal.store';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import {
	getMockContactsUi,
	mockContactBtcAddressUi,
	mockContactEthAddressUi
} from '$tests/mocks/contacts.mock';
import type { Identity } from '@dfinity/agent';
import type { WizardStep, WizardSteps } from '@dfinity/gix-components';
import { get } from 'svelte/store';
import type { MockedFunction } from 'vitest';

vi.mock('$lib/services/utils.services', () => ({
	wrapCallWith:
		<TArgs extends Record<string, unknown>, R>({
			methodToCall,
			identity
		}: {
			methodToCall: (args: TArgs & { identity: Identity | undefined }) => Promise<R>;
			toastErrorMessage?: string;
			trackEventNames?: { success: string; error: string };
			identity: Identity | undefined;
		}) =>
		(args: TArgs) =>
			methodToCall({ ...(args as object), identity } as TArgs & {
				identity: Identity | undefined;
			})
}));

const i18nStub = {
	contact: { error: { create: 'e', update: 'e', delete: 'e' } }
} as unknown as I18n;

const step0: WizardStep<AddressBookSteps> = {
	name: AddressBookSteps.ADDRESS_BOOK,
	title: 'Address Book'
};

const stepsStub: WizardSteps<AddressBookSteps> = [step0];
const modalStub = {} as AddressBookDeps['modal'];

const resetStores = () => {
	contactsStore.reset();
	currentContactId.set(undefined);
	currentAddressIndex.set(undefined);
	qrCodeAddress.set(undefined);
	loading.set(false);
};

describe('addressBookModal.services (makeController)', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		resetStores();
	});

	it('handleAddAddress: appends address, clears indices, returns SHOW_CONTACT', async () => {
		const [base] = getMockContactsUi({ n: 1, addresses: [] });
		contactsStore.set([base]);
		currentContactId.set(base.id);

		const updateContactSpy: MockedFunction<AddressBookDeps['updateContact']> = vi
			.fn<AddressBookDeps['updateContact']>()
			.mockResolvedValue(base);

		const controller = makeController({
			i18n: i18nStub,
			identity: undefined,
			createContact: vi.fn<AddressBookDeps['createContact']>(),
			updateContact: updateContactSpy,
			deleteContact: vi.fn<AddressBookDeps['deleteContact']>(),
			steps: stepsStub,
			modal: modalStub
		});

		const res = await controller.handleAddAddress(mockContactBtcAddressUi);

		expect(res?.next).toBe(AddressBookSteps.SHOW_CONTACT);
		expect(updateContactSpy).toHaveBeenCalledOnce();

		const [[firstCallArg]] = updateContactSpy.mock.calls as unknown[][] as [
			[{ contact: ContactUi; identity: Identity | undefined }]
		];

		expect(firstCallArg.contact.addresses).toEqual([mockContactBtcAddressUi]);
		expect(get(currentAddressIndex)).toBeUndefined();
		expect(get(qrCodeAddress)).toBeUndefined();
	});

	it('handleSaveAddress: updates address at index, clears index, returns EDIT_CONTACT', async () => {
		const [withEth] = getMockContactsUi({ n: 1, addresses: [mockContactEthAddressUi] });
		contactsStore.set([withEth]);
		currentContactId.set(withEth.id);
		currentAddressIndex.set(0);

		const updateContactSpy: MockedFunction<AddressBookDeps['updateContact']> = vi
			.fn<AddressBookDeps['updateContact']>()
			.mockResolvedValue(withEth);

		const controller = makeController({
			i18n: i18nStub,
			identity: undefined,
			createContact: vi.fn<AddressBookDeps['createContact']>(),
			updateContact: updateContactSpy,
			deleteContact: vi.fn<AddressBookDeps['deleteContact']>(),
			steps: stepsStub,
			modal: modalStub
		});

		const res = await controller.handleSaveAddress(mockContactBtcAddressUi);

		expect(res?.next).toBe(AddressBookSteps.EDIT_CONTACT);
		expect(updateContactSpy).toHaveBeenCalledOnce();

		const [[firstCallArg]] = updateContactSpy.mock.calls as unknown[][] as [
			[{ contact: ContactUi; identity: Identity | undefined }]
		];

		expect(firstCallArg.contact.addresses).toEqual([mockContactBtcAddressUi]);
		expect(get(currentAddressIndex)).toBeUndefined();
	});

	it('handleDeleteAddress: removes address by index and returns EDIT_CONTACT', async () => {
		const [base] = getMockContactsUi({
			n: 1,
			addresses: [mockContactBtcAddressUi, mockContactEthAddressUi]
		});
		contactsStore.set([base]);
		currentContactId.set(base.id);

		const updateContactSpy: MockedFunction<AddressBookDeps['updateContact']> = vi
			.fn<AddressBookDeps['updateContact']>()
			.mockResolvedValue(base);

		const controller = makeController({
			i18n: i18nStub,
			identity: undefined,
			createContact: vi.fn<AddressBookDeps['createContact']>(),
			updateContact: updateContactSpy,
			deleteContact: vi.fn<AddressBookDeps['deleteContact']>(),
			steps: stepsStub,
			modal: modalStub
		});

		const res = await controller.handleDeleteAddress(0);

		expect(res?.next).toBe(AddressBookSteps.EDIT_CONTACT);
		expect(updateContactSpy).toHaveBeenCalledOnce();

		const [[firstCallArg]] = updateContactSpy.mock.calls as unknown[][] as [
			[{ contact: ContactUi; identity: Identity | undefined }]
		];

		expect(firstCallArg.contact.addresses).toEqual([mockContactEthAddressUi]);
	});

	it('handleAddAvatar: delegates to updateContact with image set', async () => {
		const [base] = getMockContactsUi({ n: 1, addresses: [] });
		contactsStore.set([base]);
		currentContactId.set(base.id);

		const image: ContactImage = {
			data: new Uint8Array([1]),
			mime_type: { 'image/png': null }
		};

		const updateContactSpy: MockedFunction<AddressBookDeps['updateContact']> = vi
			.fn<AddressBookDeps['updateContact']>()
			.mockResolvedValue({ ...base, image });

		const controller = makeController({
			i18n: i18nStub,
			identity: undefined,
			createContact: vi.fn<AddressBookDeps['createContact']>(),
			updateContact: updateContactSpy,
			deleteContact: vi.fn<AddressBookDeps['deleteContact']>(),
			steps: stepsStub,
			modal: modalStub
		});

		await controller.handleAddAvatar(image);

		expect(updateContactSpy).toHaveBeenCalledOnce();

		const [[firstCallArg]] = updateContactSpy.mock.calls as unknown[][] as [
			[{ contact: ContactUi; identity: Identity | undefined }]
		];

		expect(firstCallArg.contact.image).toEqual(image);
	});

	it('handleDeleteContact: clears selection and returns ADDRESS_BOOK', async () => {
		const [base] = getMockContactsUi({ n: 1, addresses: [] });
		contactsStore.set([base]);
		currentContactId.set(base.id);

		const deleteContactSpy: MockedFunction<AddressBookDeps['deleteContact']> = vi
			.fn<AddressBookDeps['deleteContact']>()
			.mockResolvedValue(undefined);

		const controller = makeController({
			i18n: i18nStub,
			identity: undefined,
			createContact: vi.fn<AddressBookDeps['createContact']>(),
			updateContact: vi.fn<AddressBookDeps['updateContact']>(),
			deleteContact: deleteContactSpy,
			steps: stepsStub,
			modal: modalStub
		});

		const res = await controller.handleDeleteContact(base.id);

		expect(res?.next).toBe(AddressBookSteps.ADDRESS_BOOK);
		expect(deleteContactSpy).toHaveBeenCalledWith({ id: base.id });
		expect(get(currentContactId)).toBeUndefined();
		expect(get(currentAddressIndex)).toBeUndefined();
	});

	it('no-ops when currentContact is nullish', async () => {
		const updateContactSpy: MockedFunction<AddressBookDeps['updateContact']> =
			vi.fn<AddressBookDeps['updateContact']>();

		const controller = makeController({
			i18n: i18nStub,
			identity: undefined,
			createContact: vi.fn<AddressBookDeps['createContact']>(),
			updateContact: updateContactSpy,
			deleteContact: vi.fn<AddressBookDeps['deleteContact']>(),
			steps: stepsStub,
			modal: modalStub
		});

		await controller.handleAddAddress(mockContactBtcAddressUi);
		await controller.handleSaveAddress(mockContactBtcAddressUi);
		await controller.handleDeleteAddress(0);
		await controller.handleAddAvatar(null);

		expect(updateContactSpy).not.toHaveBeenCalled();
	});
});
