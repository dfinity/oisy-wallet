import AiAssistantShowContactsToolItem from '$lib/components/ai-assistant/AiAssistantShowContactsToolItem.svelte';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { render } from '@testing-library/svelte';

describe('AiAssistantShowContactsToolItem', () => {
	const [contact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	const props = {
		contact,
		onClick: () => {},
		address: contact.addresses[0]
	};

	it('renders expected data', () => {
		const { container } = render(AiAssistantShowContactsToolItem, {
			props
		});

		expect(container).toHaveTextContent(contact.name);
		expect(container).toHaveTextContent(mockContactBtcAddressUi.label as string);
		expect(container).toHaveTextContent(
			shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address })
		);
	});
});
