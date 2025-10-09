import AiAssistantShowContactsTool from '$lib/components/ai-assistant/AiAssistantShowContactsTool.svelte';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AiAssistantShowContactsTool', () => {
	const contacts = getMockContactsUi({
		n: 3,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	contacts.forEach((contact) => contactsStore.addContact(contact));

	const extendedContacts = get(extendedAddressContacts);
	const props = {
		onSendMessage: () => Promise.resolve(),
		contacts: Object.values(extendedContacts),
		loading: false
	};

	it('renders no contacts found message', () => {
		const { container } = render(AiAssistantShowContactsTool, {
			props: {
				...props,
				contacts: []
			}
		});

		expect(container).toHaveTextContent(en.ai_assistant.text.no_contacts_found_message);
	});

	it('renders all addresses correctly', () => {
		const { container } = render(AiAssistantShowContactsTool, {
			props
		});

		props.contacts.forEach(({ name, addresses }) => {
			expect(container).toHaveTextContent(name);

			addresses.forEach((address) => {
				expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: address.address }));
			});
		});
	});
});
