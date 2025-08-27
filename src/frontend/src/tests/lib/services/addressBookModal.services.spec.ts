import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { makeController } from '$lib/services/addressBookModal.services';
import { AddressBookSteps } from '$lib/enums/progress-steps';
import { contactsStore } from '$lib/stores/contacts.store';
import {
  currentContactId,
  currentAddressIndex,
  loading,
  qrCodeAddress
} from '$lib/stores/addressBookModal.store';
import {
  mockContactBtcAddressUi,
  mockContactEthAddressUi,
  getMockContactsUi
} from '$tests/mocks/contacts.mock';
import type { ContactImage } from '$declarations/backend/backend.did';

vi.mock('$lib/services/utils.services', async () => {
  return {
    wrapCallWith: ({ methodToCall }: { methodToCall: (args: any) => Promise<any> }) =>
      (args: any) => methodToCall(args)
  };
});

const i18nStub = {
  contact: { error: { create: 'e', update: 'e', delete: 'e' } }
} as unknown as I18n;

const stepsStub = [] as any;
const modalStub = {} as any;

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
    const base = getMockContactsUi({ n: 1, addresses: [] })[0];
    contactsStore.set([base]);                      
    currentContactId.set(base.id);

    const updateContactSpy = vi.fn().mockResolvedValue(base);
    const controller = makeController({
      i18n: i18nStub,
      identity: undefined,
      createContact: vi.fn(),                      
      updateContact: updateContactSpy,
      deleteContact: vi.fn(),
      steps: stepsStub,
      modal: modalStub
    });

    const res = await controller.handleAddAddress(mockContactBtcAddressUi);

    expect(res?.next).toBe(AddressBookSteps.SHOW_CONTACT);
    expect(updateContactSpy).toHaveBeenCalledTimes(1);

    const arg = updateContactSpy.mock.calls[0][0].contact as typeof base;
    expect(arg.addresses).toEqual([mockContactBtcAddressUi]);
    expect(get(currentAddressIndex)).toBeUndefined();
    expect(get(qrCodeAddress)).toBeUndefined();
  });

  it('handleSaveAddress: updates address at index, clears index, returns EDIT_CONTACT', async () => {
    const withEth = getMockContactsUi({ n: 1, addresses: [mockContactEthAddressUi] })[0];
    contactsStore.set([withEth]);
    currentContactId.set(withEth.id);
    currentAddressIndex.set(0);

    const updateContactSpy = vi.fn().mockResolvedValue(withEth);
    const controller = makeController({
      i18n: i18nStub,
      identity: undefined,
      createContact: vi.fn(),
      updateContact: updateContactSpy,
      deleteContact: vi.fn(),
      steps: stepsStub,
      modal: modalStub
    });

    const res = await controller.handleSaveAddress(mockContactBtcAddressUi);

    expect(res?.next).toBe(AddressBookSteps.EDIT_CONTACT);
    expect(updateContactSpy).toHaveBeenCalledTimes(1);

    const arg = updateContactSpy.mock.calls[0][0].contact as typeof withEth;
    expect(arg.addresses).toEqual([mockContactBtcAddressUi]);
    expect(get(currentAddressIndex)).toBeUndefined();
  });

  it('handleDeleteAddress: removes address by index and returns EDIT_CONTACT', async () => {
    const base = getMockContactsUi({
      n: 1,
      addresses: [mockContactBtcAddressUi, mockContactEthAddressUi]
    })[0];
    contactsStore.set([base]);
    currentContactId.set(base.id);

    const updateContactSpy = vi.fn().mockResolvedValue(base);
    const controller = makeController({
      i18n: i18nStub,
      identity: undefined,
      createContact: vi.fn(),
      updateContact: updateContactSpy,
      deleteContact: vi.fn(),
      steps: stepsStub,
      modal: modalStub
    });

    const res = await controller.handleDeleteAddress(0);

    expect(res?.next).toBe(AddressBookSteps.EDIT_CONTACT);
    expect(updateContactSpy).toHaveBeenCalledTimes(1);

    const arg = updateContactSpy.mock.calls[0][0].contact as typeof base;
    expect(arg.addresses).toEqual([mockContactEthAddressUi]);
  });

  it('handleAddAvatar: delegates to updateContact with image set', async () => {
    const base = getMockContactsUi({ n: 1, addresses: [] })[0];
    contactsStore.set([base]);
    currentContactId.set(base.id);

    const image: ContactImage = {
      data: new Uint8Array([1]),
      mime_type: { 'image/png': null }
    };

    const updateContactSpy = vi.fn().mockResolvedValue({ ...base, image });
    const controller = makeController({
      i18n: i18nStub,
      identity: undefined,
      createContact: vi.fn(),
      updateContact: updateContactSpy,
      deleteContact: vi.fn(),
      steps: stepsStub,
      modal: modalStub
    });

    await controller.handleAddAvatar(image);

    expect(updateContactSpy).toHaveBeenCalledTimes(1);
    const arg = updateContactSpy.mock.calls[0][0].contact;
    expect(arg.image).toEqual(image);
  });

  it('handleDeleteContact: clears selection and returns ADDRESS_BOOK', async () => {
    const base = getMockContactsUi({ n: 1, addresses: [] })[0];
    contactsStore.set([base]);
    currentContactId.set(base.id);

    const deleteContactSpy = vi.fn().mockResolvedValue(undefined);
    const controller = makeController({
      i18n: i18nStub,
      identity: undefined,
      createContact: vi.fn(),
      updateContact: vi.fn(),
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
    const updateContactSpy = vi.fn();

    const controller = makeController({
      i18n: i18nStub,
      identity: undefined,
      createContact: vi.fn(),
      updateContact: updateContactSpy,
      deleteContact: vi.fn(),
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
