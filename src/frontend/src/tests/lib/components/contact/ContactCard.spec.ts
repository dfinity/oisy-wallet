import ContactCard from '$lib/components/contact/ContactCard.svelte';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import {
	getMockContactsUi,
	mockContactBtcAddressUi,
	mockContactIcrcAddressUi
} from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('ContactCard', () => {
	// Create mock contacts using getMockContacts
	const [singleAddressContact] = getMockContactsUi({
		n: 1,
		name: 'Single Address Contact',
		addresses: [mockContactIcrcAddressUi]
	}) as unknown as ContactUi[];

	const [multipleAddressesContact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [
			mockContactIcrcAddressUi,
			mockContactBtcAddressUi,
			mockContactBtcAddressUi,
			mockContactBtcAddressUi
		]
	}) as unknown as ContactUi[];

	it('should render contact with a single address', () => {
		const onClick = vi.fn();
		const onInfo = vi.fn();

		const { getByText } = render(ContactCard, {
			props: {
				contact: singleAddressContact,
				onClick,
				onInfo
			}
		});

		// Check that the contact name is displayed
		expect(getByText(singleAddressContact.name)).toBeInTheDocument();

		// Check that the address type is displayed
		expect(getByText(en.address.types.Icrcv2)).toBeInTheDocument();

		// Check that the shortened address is displayed
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactIcrcAddressUi.address }))
		).toBeInTheDocument();
	});

	it('should call onClick when the contact card is clicked', async () => {
		const onClick = vi.fn();
		const onInfo = vi.fn();

		const { container } = render(ContactCard, {
			props: {
				contact: singleAddressContact,
				onClick,
				onInfo
			}
		});

		// Find the LogoButton
		const logoButton = container.querySelector('button');

		expect(logoButton).not.toBeNull();

		// Click the LogoButton
		await fireEvent.click(logoButton as HTMLElement);

		// Check that onClick was called
		expect(onClick).toHaveBeenCalled();
	});

	it('should call onInfo when the info button is clicked for a single address', async () => {
		const onClick = vi.fn();
		const onInfo = vi.fn();

		const { container } = render(ContactCard, {
			props: {
				contact: singleAddressContact,
				onClick,
				onInfo
			}
		});

		// Find the info button (it's inside AddressItemActions)
		const infoButton = container.querySelector('[aria-label="View"]');

		expect(infoButton).not.toBeNull();

		// Click the info button
		await fireEvent.click(infoButton as HTMLElement);

		// Check that onInfo was called with the correct address
		expect(onInfo).toHaveBeenCalledWith(mockContactIcrcAddressUi);
	});

	it('should render contact with multiple addresses in collapsed state by default', () => {
		const onClick = vi.fn();
		const onInfo = vi.fn();

		const { container, getByText, getAllByText, queryByTestId } = render(ContactCard, {
			props: {
				contact: multipleAddressesContact,
				onClick,
				onInfo
			}
		});

		// Check that the contact name is displayed
		expect(getByText(multipleAddressesContact.name)).toBeInTheDocument();

		// Check that address types are displayed in the header
		expect(getAllByText(en.address.types.Icrcv2).length).toBeGreaterThan(0);
		expect(getAllByText(en.address.types.Btc).length).toBeGreaterThan(0);

		// Check that the expand button is displayed
		const expandButton = container.querySelector(
			`[aria-label="${en.address_book.alt.show_addresses_of_contact}"]`
		);

		expect(expandButton).not.toBeNull();

		// Check that the addresses are not expanded by default
		expect(queryByTestId('collapsible-content')?.style.maxHeight).toBe('0px');
	});

	it('should expand and collapse addresses when the expand button is clicked', async () => {
		const onClick = vi.fn();
		const onInfo = vi.fn();

		const { container, queryByTestId } = render(ContactCard, {
			props: {
				contact: multipleAddressesContact,
				onClick,
				onInfo
			}
		});

		// Find the expand button
		const expandButton = container.querySelector(
			`[aria-label="${en.address_book.alt.show_addresses_of_contact}"]`
		);

		expect(expandButton).not.toBeNull();

		// The collapsible should be collapsed
		expect(queryByTestId('collapsible-content')?.style.maxHeight).toBe('0px');

		// Click the expand button
		await fireEvent.click(expandButton as HTMLElement);

		// Collapsible should be expanded
		expect(queryByTestId('collapsible-content')?.style.maxHeight).not.toBe('0px');

		// The button should now be for hiding addresses
		expect(
			container.querySelector(`[aria-label="${en.address_book.alt.hide_addresses}"]`)
		).not.toBeNull();

		// Click the collapse button
		await fireEvent.click(
			container.querySelector(`[aria-label="${en.address_book.alt.hide_addresses}"]`) as HTMLElement
		);

		// The collapsible should be collapsed again
		expect(queryByTestId('collapsible-content')?.style.maxHeight).toBe('0px');
	});

	it('should call onInfo when info button is clicked on an expanded address', async () => {
		const onClick = vi.fn();
		const onInfo = vi.fn();

		const { container, queryByTestId } = render(ContactCard, {
			props: {
				contact: multipleAddressesContact,
				onClick,
				onInfo,
				initiallyExpanded: true // Start expanded
			}
		});

		// Collapsible should be expanded
		expect(queryByTestId('collapsible-content')?.style.maxHeight).not.toBe('0px');

		// Find all info buttons
		const infoButtons = container.querySelectorAll('[aria-label="View"]');

		expect(infoButtons).toHaveLength(4); // One for each address

		// Click the second info button (BTC address)
		await fireEvent.click(infoButtons[1] as HTMLElement);

		// Check that onInfo was called with the BTC address
		expect(onInfo).toHaveBeenCalledWith(mockContactBtcAddressUi);
	});

	it('should render with expanded prop set to true', () => {
		const onClick = vi.fn();
		const onInfo = vi.fn();

		const { queryByTestId } = render(ContactCard, {
			props: {
				contact: multipleAddressesContact,
				onClick,
				onInfo,
				initiallyExpanded: true
			}
		});

		// Collapsible should be expanded
		expect(queryByTestId('collapsible-content')?.style.maxHeight).not.toBe('0px');
	});
});
