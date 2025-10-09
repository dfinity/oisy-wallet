import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('SendDataDestination', () => {
	const props = {
		destination: mockBtcAddress
	};

	const contact: ContactUi = {
		id: BigInt(1),
		name: 'Pre-existing Contact',
		updateTimestampNs: BigInt(Date.now()),
		addresses: [
			{
				address: mockBtcAddress,
				label: 'Test Label',
				addressType: 'Btc'
			}
		]
	};

	beforeEach(() => {
		contactsStore.reset();
		contactsStore.set([contact]);
	});

	it('renders data correctly', () => {
		const { container } = render(SendDataDestination, {
			props
		});

		expect(container).toHaveTextContent(en.send.text.destination);

		expect(container).toHaveTextContent(props.destination);
	});

	it('should render the contact if it is saved', () => {
		const { container } = render(SendDataDestination, {
			props
		});

		assertNonNullish(contact.addresses[0].label);

		expect(container).toHaveTextContent(contact.name);
		expect(container).toHaveTextContent(contact.addresses[0].label);
	});

	it('should not render the contact if it is not saved', () => {
		contactsStore.reset();

		const { container } = render(SendDataDestination, {
			props
		});

		assertNonNullish(contact.addresses[0].label);

		expect(container).not.toHaveTextContent(contact.name);
		expect(container).not.toHaveTextContent(contact.addresses[0].label);
	});
});
