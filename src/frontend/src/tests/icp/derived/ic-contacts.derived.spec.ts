import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icNetworkContacts } from '$icp/derived/ic-contacts.derived';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { contactsStore } from '$lib/stores/contacts.store';
import { token } from '$lib/stores/token.store';
import type { ContactUi } from '$lib/types/contact';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { getMockContactsUi, mockContactIcrcAddressUi } from '$tests/mocks/contacts.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';
import { get } from 'svelte/store';

describe('ic-contacts.derived', () => {
	describe('icNetworkContacts', () => {
		beforeEach(() => {
			contactsStore.reset();
			token.reset();
		});

		const contactsWithPrincipal = getMockContactsUi({
			n: 2,
			name: 'Multiple Addresses Contact',
			addresses: [
				{
					...mockContactIcrcAddressUi,
					address: mockPrincipalText
				}
			]
		}) as unknown as ContactUi[];
		const contactsWithAccountIdentifier = getMockContactsUi({
			n: 1,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactIcrcAddressUi]
		}) as unknown as ContactUi[];

		it('has correct data if there are some IC contacts and current token is ICRC', () => {
			token.set(mockValidIcrcToken);
			contactsStore.set([...contactsWithPrincipal, ...contactsWithAccountIdentifier]);

			expect(get(icNetworkContacts)).toStrictEqual({
				[getNetworkContactKey({
					contact: contactsWithPrincipal[0],
					address: mockPrincipalText
				})]: {
					address: mockPrincipalText,
					contact: contactsWithPrincipal[0]
				},
				[getNetworkContactKey({
					contact: contactsWithPrincipal[1],
					address: mockPrincipalText
				})]: {
					address: mockPrincipalText,
					contact: contactsWithPrincipal[1]
				}
			});
		});

		it('has correct data if there are some IC contacts and current token is ICP', () => {
			token.set(ICP_TOKEN);
			contactsStore.set([...contactsWithPrincipal, ...contactsWithAccountIdentifier]);

			expect(get(icNetworkContacts)).toStrictEqual({
				[getNetworkContactKey({
					contact: contactsWithPrincipal[0],
					address: mockPrincipalText
				})]: {
					address: mockPrincipalText,
					contact: contactsWithPrincipal[0]
				},
				[getNetworkContactKey({
					contact: contactsWithPrincipal[1],
					address: mockPrincipalText
				})]: {
					address: mockPrincipalText,
					contact: contactsWithPrincipal[1]
				},
				[getNetworkContactKey({
					contact: contactsWithAccountIdentifier[0],
					address: mockContactIcrcAddressUi.address
				})]: {
					address: mockContactIcrcAddressUi.address,
					contact: contactsWithAccountIdentifier[0]
				}
			});
		});

		it('has correct data if there are some IC contacts with duplicated ids and current token is ICP', () => {
			const contactsWithPrincipalAndAccountId = getMockContactsUi({
				n: 2,
				name: 'Multiple Addresses Contact',
				addresses: [
					{
						...mockContactIcrcAddressUi,
						address: mockPrincipalText
					},
					{
						...mockContactIcrcAddressUi,
						address: getAccountIdentifier(Principal.fromText(mockPrincipalText)).toHex()
					}
				]
			}) as unknown as ContactUi[];

			token.set(ICP_TOKEN);
			contactsStore.set([...contactsWithPrincipalAndAccountId, ...contactsWithAccountIdentifier]);

			expect(get(icNetworkContacts)).toStrictEqual({
				[getNetworkContactKey({
					contact: contactsWithPrincipalAndAccountId[0],
					address: mockPrincipalText
				})]: {
					address: mockPrincipalText,
					contact: contactsWithPrincipalAndAccountId[0]
				},
				[getNetworkContactKey({
					contact: contactsWithPrincipalAndAccountId[1],
					address: mockPrincipalText
				})]: {
					address: mockPrincipalText,
					contact: contactsWithPrincipalAndAccountId[1]
				},
				[getNetworkContactKey({
					contact: contactsWithAccountIdentifier[0],
					address: mockContactIcrcAddressUi.address
				})]: {
					address: mockContactIcrcAddressUi.address,
					contact: contactsWithAccountIdentifier[0]
				}
			});
		});

		it('has no data if there are no IC contacts', () => {
			expect(get(icNetworkContacts)).toStrictEqual({});
		});
	});
});
