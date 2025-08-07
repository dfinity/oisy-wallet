import AiAssistantShowContactsTool from '$lib/components/ai-assistant/AiAssistantShowContactsTool.svelte';
import { MAX_DISPLAYED_ADDRESSES_NUMBER } from '$lib/constants/ai-assistant.constants';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('AiAssistantShowContactsTool', () => {
	const contacts = getMockContactsUi({
		n: 3,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	const props = {
		contacts
	};

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
