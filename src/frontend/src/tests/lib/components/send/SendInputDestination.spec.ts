import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SendInputDestination', () => {
	const props = {
		destination: mockEthAddress,
		networkContacts: {},
		inputPlaceholder: 'test',
		isInvalidDestination: undefined
	};

	it('renders provided destination', () => {
		const { getByText } = render(SendInputDestination, {
			props
		});

		expect(getByText(en.core.text.to)).toBeInTheDocument();
	});

	it('renders provided destination if inputted address is uppercased', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				destination: props.destination.toUpperCase()
			}
		});

		expect(getByText(en.core.text.to)).toBeInTheDocument();
	});

	it('renders invalid destination error message', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: true
			}
		});

		expect(getByText(en.send.assertion.invalid_destination_address)).toBeInTheDocument();
	});

	it('does not render unknown destination warning message if there is a contact with the provided address', () => {
		const [contact] = getMockContactsUi({
			n: 1,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactEthAddressUi]
		}) as unknown as ContactUi[];

		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {},
				networkContacts: {
					[props.destination]: contact
				}
			}
		});

		expect(() => getByText(en.send.info.unknown_destination)).toThrow();
	});

	it('renders unknown destination warning message', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {}
			}
		});

		expect(getByText(en.send.info.unknown_destination)).toBeInTheDocument();
	});
});
