import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import {
	generateAiAssistantResponseEventMetadata,
	parseReviewSendTokensToolArguments,
	parseShowFilteredContactsToolArguments,
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
				[`${extendedAddressContactUi.id}`]: aiAssistantContact
			});
		});
	});

	describe('parseReviewSendTokenToolArguments', () => {
		const sendValue = 0.00001;
		const mockRandomUUID = 'd7775002-80bf-4208-a2f0-84225281677a';

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => mockRandomUUID);
		});

		it('returns correct result when selectedContactAddressId is provided', () => {
			expect(
				parseReviewSendTokensToolArguments({
					filterParams: [
						{
							value: extendedAddressContactUi.addresses[0].id,
							name: 'selectedContactAddressId'
						},
						{
							value: `${sendValue}`,
							name: 'amountNumber'
						},
						{
							value: 'ICP',
							name: 'tokenSymbol'
						}
					],
					tokens: [ICP_TOKEN, ETHEREUM_TOKEN, BTC_MAINNET_TOKEN],
					extendedAddressContacts: storeData
				})
			).toEqual({
				token: ICP_TOKEN,
				contactAddress: extendedAddressContactUi.addresses[0],
				contact: extendedAddressContactUi,
				amount: sendValue,
				address: undefined,
				id: mockRandomUUID,
				sendCompleted: false
			});
		});

		it('returns correct result when address is provided', () => {
			expect(
				parseReviewSendTokensToolArguments({
					filterParams: [
						{
							value: mockEthAddress,
							name: 'address'
						},
						{
							value: `${sendValue}`,
							name: 'amountNumber'
						},
						{
							value: 'ETH',
							name: 'tokenSymbol'
						},
						{
							value: 'ETH',
							name: 'networkId'
						}
					],
					tokens: [ICP_TOKEN, ETHEREUM_TOKEN, BTC_MAINNET_TOKEN],
					extendedAddressContacts: storeData
				})
			).toEqual({
				token: ETHEREUM_TOKEN,
				contactAddress: undefined,
				contact: undefined,
				amount: sendValue,
				address: mockEthAddress,
				id: mockRandomUUID,
				sendCompleted: false
			});
		});
	});

	describe('parseShowFilteredContactsToolArguments', () => {
		it('returns correct result when addressIds is provided', () => {
			expect(
				parseShowFilteredContactsToolArguments({
					filterParams: [
						{
							value: `["${extendedAddressContactUi.addresses[0].id}"]`,
							name: 'addressIds'
						}
					],
					extendedAddressContacts: storeData
				})
			).toEqual({
				contacts: [extendedAddressContactUi]
			});
		});

		it('returns empty result when addressIds cannot be matched with existing contacts', () => {
			expect(
				parseShowFilteredContactsToolArguments({
					filterParams: [
						{
							value: '["random-id"]',
							name: 'addressIds'
						}
					],
					extendedAddressContacts: storeData
				})
			).toEqual({
				contacts: []
			});
		});
	});

	describe('generateAiAssistantResponseEventMetadata', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('returns correct result with a tool name', () => {
			const requestStartTimestamp = 1000000;
			vi.spyOn(Date, 'now').mockReturnValue(requestStartTimestamp + 4000000);

			expect(
				generateAiAssistantResponseEventMetadata({
					toolName: 'test',
					requestStartTimestamp
				})
			).toEqual({
				toolName: 'test',
				responseTime: '4000s',
				responseTimeCategory: '100000+'
			});
		});

		it('returns correct result without a tool name', () => {
			const requestStartTimestamp = 9000000;
			vi.spyOn(Date, 'now').mockReturnValue(requestStartTimestamp + 65579);

			expect(
				generateAiAssistantResponseEventMetadata({
					requestStartTimestamp
				})
			).toEqual({
				responseTime: '65.579s',
				responseTimeCategory: '20001-100000'
			});
		});
	});
});
