import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import {
	parseFromAiAssistantContacts,
	parseToAiAssistantContacts
} from '$lib/utils/ai-assistant.utils';
import { mapToFrontendContact } from '$lib/utils/contact.utils';
import { getMockContacts } from '$tests/mocks/contacts.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { get } from 'svelte/store';

describe('ai-assistant.utils', () => {
	const contactsData = getMockContacts({
		n: 1,
		names: ['Alice'],
		addresses: [
			[{ label: ['Test'], token_account_id: { Eth: { Public: mockEthAddress } } }],
			[{ label: ['Test 2'], token_account_id: { Eth: { Public: mockEthAddress2 } } }]
		]
	}).map(mapToFrontendContact);

	contactsData.forEach((contact) => contactsStore.addContact(contact));

	const storeData = get(extendedAddressContacts);
	const extendedAddressContactUi = storeData[`${contactsData[0].id}`];
	const aiAssistantContact = {
		id: extendedAddressContactUi.id,
		name: extendedAddressContactUi.name,
		addresses: [
			{
				addressType: extendedAddressContactUi.addresses[0].addressType,
				id: extendedAddressContactUi.addresses[0].id,
				label: extendedAddressContactUi.addresses[0].label
			}
		]
	};

	describe('parseToAiAssistantContacts', () => {
		it('returns correct result', () => {
			expect(parseToAiAssistantContacts(storeData)).toEqual({
				[`${aiAssistantContact.id}`]: aiAssistantContact
			});
		});
	});

	describe('parseFromAiAssistantContacts', () => {
		it('returns correct result', () => {
			expect(
				parseFromAiAssistantContacts({
					aiAssistantContacts: [aiAssistantContact],
					extendedAddressContacts: storeData
				})
			).toEqual([extendedAddressContactUi]);
		});
	});
});
