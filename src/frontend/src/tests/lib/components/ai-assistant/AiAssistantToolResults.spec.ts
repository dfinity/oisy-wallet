import AiAssistantToolResults from '$lib/components/ai-assistant/AiAssistantToolResults.svelte';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ToolResult } from '$lib/types/ai-assistant';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
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

	it('renders known tool correctly', () => {
		const { getByText } = render(AiAssistantToolResults, {
			props: {
				results: [
					{
						type: 'show_contacts',
						result: { contacts: Object.values(extendedContacts) }
					}
				]
			}
		});

		expect(getByText(contacts[0].name)).toBeInTheDocument();
	});

	it('does not render unknown tool', () => {
		const { getByText } = render(AiAssistantToolResults, {
			props: {
				// @ts-expect-error Testing unknown tool type
				results: [{ type: 'unknown_tool', result: contacts } as ToolResult]
			}
		});

		expect(() => getByText(contacts[0].name)).toThrow();
	});
});
