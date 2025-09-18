import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import AiAssistantToolResults from '$lib/components/ai-assistant/AiAssistantToolResults.svelte';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import { ToolResultType, type ToolResult } from '$lib/types/ai-assistant';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AiAssistantToolResults', () => {
	const contacts = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	contacts.forEach((contact) => contactsStore.addContact(contact));

	const extendedContacts = get(extendedAddressContacts);

	it('renders show_all_contacts tool correctly', () => {
		const { getByText } = render(AiAssistantToolResults, {
			props: {
				isLastItem: false,
				false: false,
				onSendMessage: () => Promise.resolve(),
				results: [
					{
						type: ToolResultType.SHOW_ALL_CONTACTS,
						result: { contacts: Object.values(extendedContacts) }
					}
				]
			}
		});

		expect(getByText(contacts[0].name)).toBeInTheDocument();
	});

	it('renders show_filtered_contacts tool correctly', () => {
		const { getByText } = render(AiAssistantToolResults, {
			props: {
				isLastItem: false,
				false: false,
				onSendMessage: () => Promise.resolve(),
				results: [
					{
						type: ToolResultType.SHOW_FILTERED_CONTACTS,
						result: { contacts: Object.values(extendedContacts) }
					}
				]
			}
		});

		expect(getByText(contacts[0].name)).toBeInTheDocument();
	});

	it('renders review_send_tokens tool correctly', () => {
		const { getByText } = render(AiAssistantToolResults, {
			props: {
				isLastItem: false,
				loading: false,
				onSendMessage: () => Promise.resolve(),
				results: [
					{
						type: ToolResultType.REVIEW_SEND_TOKENS,
						result: { amount: 1, token: ICP_TOKEN, address: mockPrincipalText }
					}
				]
			}
		});

		expect(getByText(en.transaction.text.to)).toBeInTheDocument();
		expect(getByText(mockPrincipalText)).toBeInTheDocument();
	});

	it('does not render unknown tool', () => {
		const { getByText } = render(AiAssistantToolResults, {
			props: {
				isLastItem: false,
				loading: false,
				onSendMessage: () => Promise.resolve(),
				// @ts-expect-error Testing unknown tool type
				results: [{ type: 'unknown_tool', result: contacts } as ToolResult]
			}
		});

		expect(() => getByText(contacts[0].name)).toThrow();
	});
});
