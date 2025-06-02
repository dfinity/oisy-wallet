import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import KnownDestination from '$lib/components/send/KnownDestination.svelte';
import { MAX_DISPLAYED_KNOWN_DESTINATION_AMOUNTS } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('KnownDestination', () => {
	const [contact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	const props = {
		destination: mockBtcAddress,
		onClick: () => {},
		amounts: [
			{ value: 10000000n, token: BTC_MAINNET_TOKEN },
			{ value: 20000000n, token: BTC_MAINNET_TOKEN },
			{ value: 30000000n, token: BTC_MAINNET_TOKEN }
		]
	};

	it('renders all amounts if the array length is smaller than the max amount', () => {
		const { container } = render(KnownDestination, {
			props
		});

		props.amounts.forEach(({ value, token }) => {
			expect(container).toHaveTextContent(
				`${formatToken({
					value,
					unitName: BTC_MAINNET_TOKEN.decimals,
					displayDecimals: BTC_MAINNET_TOKEN.decimals
				})} ${token.symbol}`
			);
		});
	});

	it('renders all amounts and more label if the array length is greater than the max amount', () => {
		const newProps = {
			...props,
			amounts: [...props.amounts, ...props.amounts]
		};
		const { container } = render(KnownDestination, {
			props: newProps
		});

		props.amounts.forEach(({ value, token }) => {
			expect(container).toHaveTextContent(
				`${formatToken({
					value,
					unitName: BTC_MAINNET_TOKEN.decimals,
					displayDecimals: BTC_MAINNET_TOKEN.decimals
				})} ${token.symbol}`
			);
		});

		expect(container).toHaveTextContent(
			replacePlaceholders(en.core.text.more_items, {
				$items: `${newProps.amounts.length - MAX_DISPLAYED_KNOWN_DESTINATION_AMOUNTS}`
			})
		);
	});

	it('renders destination if no contact provided', () => {
		const { getByText } = render(KnownDestination, {
			props
		});

		expect(getByText(shortenWithMiddleEllipsis({ text: props.destination }))).toBeInTheDocument();
	});

	it('renders contact data if contact is provided', () => {
		const { container } = render(KnownDestination, {
			props: {
				...props,
				contact
			}
		});

		expect(container).toHaveTextContent(contact.name);
	});
});
