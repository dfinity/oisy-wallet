import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SendInputDestination', () => {
	const props = {
		destination: mockEthAddress,
		networkContacts: {},
		inputPlaceholder: 'test',
		isInvalidDestination: undefined
	};

	const mockContext = (sendToken: Token) =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					token: sendToken
				})
			]
		]);

	it('renders provided destination', () => {
		const { getByText } = render(SendInputDestination, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.core.text.to)).toBeInTheDocument();
	});

	it('renders provided destination if inputted address is uppercased', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				destination: props.destination.toUpperCase()
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.core.text.to)).toBeInTheDocument();
	});

	it('renders invalid destination error message', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: true
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.send.assertion.invalid_destination_address)).toBeInTheDocument();
	});

	it('does not render invalid destination error message if destination length is less than required limit', () => {
		const { queryByText } = render(SendInputDestination, {
			props: {
				...props,
				destination: 'Test',
				invalidDestination: true
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(queryByText(en.send.assertion.invalid_destination_address)).not.toBeInTheDocument();
	});

	it('does not render unknown destination warning message if there is a contact with the provided address', () => {
		const [contact] = getMockContactsUi({
			n: 1,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactEthAddressUi]
		}) as unknown as ContactUi[];

		const { queryByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {},
				networkContacts: {
					[getNetworkContactKey({
						contact,
						address: props.destination
					})]: {
						contact,
						address: props.destination
					}
				}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(queryByText(en.send.info.unknown_destination)).not.toBeInTheDocument();
	});

	it('does not render unknown destination warning message if inserted destination is less than 10 characters', () => {
		const { queryByText } = render(SendInputDestination, {
			props: {
				...props,
				destination: '0x1d63841',
				invalidDestination: false,
				knownDestinations: {}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(queryByText(en.send.info.unknown_destination)).not.toBeInTheDocument();
	});

	it('renders unknown destination warning message', () => {
		const { getByText } = render(SendInputDestination, {
			props: {
				...props,
				invalidDestination: false,
				knownDestinations: {}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(getByText(en.send.info.unknown_destination)).toBeInTheDocument();
	});
});
