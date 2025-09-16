import AiAssistantShowContactsToolItem from '$lib/components/ai-assistant/AiAssistantShowContactsToolItem.svelte';
import type { ExtendedAddressContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import {
	getMockContactsUi,
	mockContactBtcAddressUi,
	mockContactEthAddressUi
} from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('AiAssistantShowContactsToolItem', () => {
	const [singleAddressContact] = getMockContactsUi({
		n: 1,
		name: 'Single Address Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ExtendedAddressContactUi[];
	const [multipleAddressContact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Address Contact',
		addresses: [mockContactBtcAddressUi, mockContactEthAddressUi]
	}) as unknown as ExtendedAddressContactUi[];

	const props = {
		contact: singleAddressContact,
		onClick: () => {}
	};

	it('renders expected data with single address contact', () => {
		const { container } = render(AiAssistantShowContactsToolItem, {
			props
		});

		expect(container).toHaveTextContent(singleAddressContact.name);
		expect(container).toHaveTextContent(en.address.types[mockContactBtcAddressUi.addressType]);
		expect(container).toHaveTextContent(
			shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address })
		);
	});

	it('renders expected data with multiple address contact', () => {
		const { container } = render(AiAssistantShowContactsToolItem, {
			props: {
				...props,
				contact: multipleAddressContact
			}
		});

		expect(container).toHaveTextContent(multipleAddressContact.name);
		expect(container).toHaveTextContent(en.address.types[mockContactBtcAddressUi.addressType]);
		expect(container).toHaveTextContent(en.address.types[mockContactEthAddressUi.addressType]);
	});
});
