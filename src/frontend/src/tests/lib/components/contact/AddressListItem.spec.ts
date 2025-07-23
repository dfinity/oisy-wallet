import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
import {
	ADDRESS_LIST_ITEM_COPY_BUTTON,
	ADDRESS_LIST_ITEM_INFO_BUTTON
} from '$lib/constants/test-ids.constants';
import type { ContactAddressUi } from '$lib/types/contact';
import * as clipboardUtils from '$lib/utils/clipboard.utils';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockAccountIdentifierText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('AddressListItem', () => {
	// Mock the i18n store
	const mockI18n = readable(en);

	// Mock the clipboard utils
	vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(undefined);

	// Setup the context with the mocked i18n store
	const mockContext = new Map([['i18n', mockI18n]]);

	const icrcAddress: ContactAddressUi = {
		addressType: 'Icrcv2',
		address: mockAccountIdentifierText
	};

	const btcAddress: ContactAddressUi = {
		addressType: 'Btc',
		address: mockBtcAddress,
		label: 'My Bitcoin Address'
	};

	const ethAddress: ContactAddressUi = {
		addressType: 'Eth',
		address: mockEthAddress
	};

	const solAddress: ContactAddressUi = {
		addressType: 'Sol',
		address: mockSolAddress
	};

	it('should render ICRC address correctly', () => {
		const { container } = render(AddressListItem, {
			props: { address: icrcAddress },
			context: mockContext
		});

		// Check address type name is displayed
		expect(container).toHaveTextContent(en.address.types.Icrcv2);

		// Check shortened address is displayed
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: icrcAddress.address }));

		// Check that alias is not displayed (since it's not provided)
		expect(container).not.toHaveTextContent('•');
	});

	it('should render BTC address with alias correctly', () => {
		const { container } = render(AddressListItem, {
			props: { address: btcAddress },
			context: mockContext
		});

		// Check address type name is displayed
		expect(container).toHaveTextContent(en.address.types.Btc);

		// Check shortened address is displayed
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: btcAddress.address }));

		// Check that alias is displayed
		expect(container).toHaveTextContent(btcAddress.label as string);

		// Check that the separator dot is displayed
		expect(container).toHaveTextContent('•');
	});

	it('should render ETH address correctly', () => {
		const { container } = render(AddressListItem, {
			props: { address: ethAddress },
			context: mockContext
		});

		// Check address type name is displayed
		expect(container).toHaveTextContent(en.address.types.Eth);

		// Check shortened address is displayed
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: ethAddress.address }));
	});

	it('should render SOL address correctly', () => {
		const { container } = render(AddressListItem, {
			props: { address: solAddress },
			context: mockContext
		});

		// Check address type name is displayed
		expect(container).toHaveTextContent(en.address.types.Sol);

		// Check shortened address is displayed
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: solAddress.address }));
	});

	it('should call onclick when clicked', async () => {
		const onClick = vi.fn();

		const { container } = render(AddressListItem, {
			props: {
				address: icrcAddress,
				onClick
			},
			context: mockContext
		});

		// Find the button element
		const button = container.querySelector('button');

		expect(button).not.toBeNull();

		// Click the button
		await fireEvent.click(button as HTMLElement);

		// Check that onclick was called
		expect(onClick).toHaveBeenCalled();
	});

	it('should call oninfo when info button is clicked', async () => {
		const onInfo = vi.fn();

		const { getByTestId } = render(AddressListItem, {
			props: {
				address: icrcAddress,
				addressItemActionsProps: { onInfo }
			},
			context: mockContext
		});

		// Find the info button using test ID
		const infoButton = getByTestId(ADDRESS_LIST_ITEM_INFO_BUTTON);

		// Click the info button
		await fireEvent.click(infoButton);

		// Check that oninfo was called
		expect(onInfo).toHaveBeenCalled();
	});

	it('should not show info button when no onInfo is provided', () => {
		const { queryByTestId } = render(AddressListItem, {
			props: {
				address: icrcAddress
			},
			context: mockContext
		});

		// The info button should not be present
		const infoButton = queryByTestId(ADDRESS_LIST_ITEM_INFO_BUTTON);

		expect(infoButton).toBeNull();
	});

	it('should copy address to clipboard when copy button is clicked', async () => {
		const { getByTestId } = render(AddressListItem, {
			props: { address: icrcAddress },
			context: mockContext
		});

		// Find the copy button using test ID
		const copyButton = getByTestId(ADDRESS_LIST_ITEM_COPY_BUTTON);

		// Click the copy button
		await fireEvent.click(copyButton);

		// Check that copyToClipboard was called with the correct arguments
		expect(clipboardUtils.copyToClipboard).toHaveBeenCalledWith({
			text: en.wallet.text.address_copied,
			value: icrcAddress.address
		});
	});

	it('should apply custom style class', () => {
		const customClass = 'custom-class';

		const { container } = render(AddressListItem, {
			props: {
				address: icrcAddress,
				styleClass: customClass
			},
			context: mockContext
		});

		// Check that the custom class is applied
		const button = container.querySelector('button');

		expect(button?.classList.contains(customClass)).toBeTruthy();
	});

	it('should display shortened address by default', () => {
		const { container } = render(AddressListItem, {
			props: { address: icrcAddress },
			context: mockContext
		});

		// Check shortened address is displayed
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: icrcAddress.address }));
		// Check full address is not displayed
		expect(container).not.toHaveTextContent(icrcAddress.address);
	});

	it('should display full address when showFullAddress is true', () => {
		const { container } = render(AddressListItem, {
			props: {
				address: icrcAddress,
				showFullAddress: true
			},
			context: mockContext
		});

		// Check full address is displayed
		expect(container).toHaveTextContent(icrcAddress.address);
	});
});
