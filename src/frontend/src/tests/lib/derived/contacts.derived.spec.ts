import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import {
	allContacts,
	contacts,
	contactsNotInitialized,
	extendedAddressContacts,
	sortedContacts
} from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import { mapToFrontendContact } from '$lib/utils/contact.utils';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { getMockContacts } from '$tests/mocks/contacts.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { get } from 'svelte/store';

describe('contacts.derived', () => {
	const certifiedMinterInfo = { data: mockCkMinterInfo, certified: true };

	beforeEach(() => {
		contactsStore.reset();

		ckEthMinterInfoStore.reinitialize();
	});

	describe('contactsNotInitialized', () => {
		it('should return true if contacts store is not initialized', () => {
			expect(get(contactsNotInitialized)).toBeTruthy();
		});

		it('should return false if contacts store is initialized', () => {
			contactsStore.addContact(
				getMockContacts({ n: 1, names: ['John'], addresses: [] }).map(mapToFrontendContact)[0]
			);

			expect(get(contactsNotInitialized)).toBeFalsy();
		});
	});

	describe('contacts', () => {
		it('should return empty list if no contact added or not initialized', () => {
			expect(get(contacts)).toEqual([]);
		});

		it('should return one contact when it is added', () => {
			contactsStore.addContact(
				getMockContacts({ n: 1, names: ['John'], addresses: [] }).map(mapToFrontendContact)[0]
			);

			expect(get(contacts)?.[0]?.name).toEqual('John');
		});
	});

	describe('allContacts', () => {
		it('should return empty array when both stores are empty', () => {
			expect(get(allContacts)).toEqual([]);
		});

		it('should return only built-in contacts when contactsStore is not initialized', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});

			const result = get(allContacts);

			expect(result).toHaveLength(3);
			expect(result[0].name).toBe('ckETH Minter Helper Contract');
		});

		it('should return only user contacts when ckEthMinterInfoStore is empty', () => {
			contactsStore.addContact(
				getMockContacts({ n: 1, names: ['Alice'], addresses: [] }).map(mapToFrontendContact)[0]
			);

			const result = get(allContacts);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Alice');
		});

		it('should place built-in contacts before user contacts', () => {
			ckEthMinterInfoStore.set({
				id: ETHEREUM_TOKEN_ID,
				data: certifiedMinterInfo
			});

			contactsStore.addContact(
				getMockContacts({ n: 1, names: ['Alice'], addresses: [] }).map(mapToFrontendContact)[0]
			);

			const result = get(allContacts);

			expect(result).toHaveLength(4);
			expect(result[0].name).toBe('ckETH Minter Helper Contract');
			expect(result[1].name).toBe('ckERC20 Minter Helper Contract');
			expect(result[2].name).toBe('CK Ethereum Minter');
			expect(result[3].name).toBe('Alice');
		});
	});

	describe('sortedContacts', () => {
		it('should return empty list if no contact added or not initialized', () => {
			expect(get(sortedContacts)).toEqual([]);
		});

		it('should return contacts sorted by name', () => {
			const contactsData = getMockContacts({
				n: 3,
				// Randomizing names to ensure sorting works
				names: ['Alice', 'Bob', 'Charlie'].sort(() => Math.random() - 0.5),
				addresses: []
			}).map(mapToFrontendContact);

			contactsData.forEach((contact) => contactsStore.addContact(contact));

			const sorted = get(sortedContacts);

			expect(sorted[0].name).toEqual('Alice');
			expect(sorted[1].name).toEqual('Bob');
			expect(sorted[2].name).toEqual('Charlie');
		});
	});

	describe('extendedAddressContacts', () => {
		it('should return empty object if no contact added or not initialized', () => {
			expect(get(extendedAddressContacts)).toEqual({});
		});

		it('should return extended address contacts', () => {
			const contactsData = getMockContacts({
				n: 1,
				names: ['Alice'],
				addresses: [
					[{ label: ['Test'], token_account_id: { Eth: { Public: mockEthAddress } } }],
					[{ label: ['Test 2'], token_account_id: { Eth: { Public: mockEthAddress2 } } }]
				]
			}).map(mapToFrontendContact);

			contactsData.forEach((contact) => contactsStore.addContact(contact));

			const result = get(extendedAddressContacts);

			result[`${contactsData[0].id}`].addresses.forEach((address) => {
				expect(address).toHaveProperty('id');
			});
		});
	});
});
