import AiAssistantShowContactsTool from '$lib/components/ai-assistant/AiAssistantShowContactsTool.svelte';
import { MAX_DISPLAYED_ADDRESSES_NUMBER } from '$lib/constants/ai-assistant.constants';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
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
		contacts: Object.values(extendedContacts)
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

	it('renders all addresses if the array length is smaller than the max amount', () => {
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

	it('renders addresses and more label if the addresses number is greater than the max amount', () => {
		const newProps = {
			...props,
			contacts: [...props.contacts, ...props.contacts]
		};
		const { container } = render(AiAssistantShowContactsTool, {
			props: newProps
		});

		props.contacts.slice(MAX_DISPLAYED_ADDRESSES_NUMBER).forEach(({ name, addresses }) => {
			expect(container).toHaveTextContent(name);

			addresses.forEach((address) => {
				expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: address.address }));
			});
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.core.text.more_items, {
				$items: `${newProps.contacts.length - MAX_DISPLAYED_ADDRESSES_NUMBER}`
			})
		);
	});
});
