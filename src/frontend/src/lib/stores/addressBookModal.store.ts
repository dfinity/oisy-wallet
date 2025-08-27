import { writable, derived } from 'svelte/store';
import { sortedContacts } from '$lib/derived/contacts.derived';
import type { WizardStep } from '@dfinity/gix-components';
import { AddressBookSteps } from '$lib/enums/progress-steps';

export const loading = writable(false);
export const currentStep = writable<WizardStep<AddressBookSteps>>();
export const previousStepName = writable<AddressBookSteps | undefined>();

export const currentContactId = writable<bigint | undefined>();
export const currentAddressIndex = writable<number | undefined>();
export const qrCodeAddress = writable<string | undefined>();
export const isDeletingContact = writable(false);
export const editContactNameTitle = writable('');

export const currentContact = derived(
  [currentContactId, sortedContacts],
  ([$id, $contacts]) => $contacts.find(c => c.id === $id)
);

export const currentStepName = derived(currentStep, $step => $step?.name);
