import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icNetworkContacts } from '$icp/derived/ic-contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import { token } from '$lib/stores/token.store';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactIcrcAddressUi } from '$tests/mocks/contacts.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

describe('ic-contacts.derived', () => {
	describe('icNetworkContacts', () => {
		beforeEach(() => {
			contactsStore.reset();
			token.reset();
		});

		it('has correct data if there are some IC contacts and current token is ICRC', () => {
			const contactWithIcrcAddress = getMockContactsUi({
				n: 3,
				name: 'Multiple Addresses Contact',
				addresses: [
					{
						...mockContactIcrcAddressUi,
						address: mockPrincipalText
					}
				]
			}) as unknown as ContactUi[];

			token.set(mockValidIcrcToken);
			contactsStore.set([...contactWithIcrcAddress]);

			expect(get(icNetworkContacts)).toStrictEqual({
				[mockPrincipalText]: contactWithIcrcAddress[0]
			});
		});

		it('has correct data if there are some IC contacts and current token is ICP', () => {
			const contactWithIcrcAddress = getMockContactsUi({
				n: 3,
				name: 'Multiple Addresses Contact',
				addresses: [mockContactIcrcAddressUi]
			}) as unknown as ContactUi[];

			token.set(ICP_TOKEN);
			contactsStore.set([...contactWithIcrcAddress]);

			expect(get(icNetworkContacts)).toStrictEqual({
				[mockContactIcrcAddressUi.address]: contactWithIcrcAddress[0]
			});
		});

		it('has no data if there are no IC contacts', () => {
			expect(get(icNetworkContacts)).toStrictEqual({});
		});
	});
});
