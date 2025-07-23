import AddressItemActions from '$lib/components/contact/AddressItemActions.svelte';
import {
	ADDRESS_LIST_ITEM_COPY_BUTTON,
	ADDRESS_LIST_ITEM_DELETE_BUTTON,
	ADDRESS_LIST_ITEM_EDIT_BUTTON,
	ADDRESS_LIST_ITEM_INFO_BUTTON
} from '$lib/constants/test-ids.constants';
import type { ContactAddressUi } from '$lib/types/contact';
import * as clipboardUtils from '$lib/utils/clipboard.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('AddressItemActions', () => {
	// Mock the i18n store
	const mockI18n = readable(en);

	// Mock the clipboard utils
	vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(undefined);

	// Setup the context with the mocked i18n store
	const mockContext = new Map([['i18n', mockI18n]]);

	const mockAddress: ContactAddressUi = {
		addressType: 'Btc',
		address: mockBtcAddress
	};

	it('should render copy button', () => {
		const { getByTestId } = render(AddressItemActions, {
			props: { address: mockAddress },
			context: mockContext
		});

		// Check that the copy button is rendered
		expect(getByTestId(ADDRESS_LIST_ITEM_COPY_BUTTON)).toBeInTheDocument();
	});

	it('should not render copy button when hideCopyButton is true', () => {
		const { queryByTestId } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				hideCopyButton: true
			},
			context: mockContext
		});

		// Check that the copy button is not rendered
		expect(queryByTestId(ADDRESS_LIST_ITEM_COPY_BUTTON)).toBeNull();
	});

	it('should render info button when onInfo is provided', () => {
		const onInfo = vi.fn();

		const { getByTestId } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				onInfo
			},
			context: mockContext
		});

		// Check that the info button is rendered
		expect(getByTestId(ADDRESS_LIST_ITEM_INFO_BUTTON)).toBeInTheDocument();
	});

	it('should not render info button when onInfo is not provided', () => {
		const { queryByTestId } = render(AddressItemActions, {
			props: { address: mockAddress },
			context: mockContext
		});

		// Check that the info button is not rendered
		expect(queryByTestId(ADDRESS_LIST_ITEM_INFO_BUTTON)).toBeNull();
	});

	it('should render edit button when onEdit is provided', () => {
		const onEdit = vi.fn();

		const { getByTestId } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				onEdit
			},
			context: mockContext
		});

		// Check that the edit button is rendered
		expect(getByTestId(ADDRESS_LIST_ITEM_EDIT_BUTTON)).toBeInTheDocument();
	});

	it('should not render edit button when onEdit is not provided', () => {
		const { queryByTestId } = render(AddressItemActions, {
			props: { address: mockAddress },
			context: mockContext
		});

		// Check that the edit button is not rendered
		expect(queryByTestId(ADDRESS_LIST_ITEM_EDIT_BUTTON)).toBeNull();
	});

	it('should render delete button when onDelete is provided', () => {
		const onDelete = vi.fn();

		const { getByTestId } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				onDelete
			},
			context: mockContext
		});

		// Check that the delete button is rendered
		expect(getByTestId(ADDRESS_LIST_ITEM_DELETE_BUTTON)).toBeInTheDocument();
	});

	it('should not render delete button when onDelete is not provided', () => {
		const { queryByTestId } = render(AddressItemActions, {
			props: { address: mockAddress },
			context: mockContext
		});

		// Check that the delete button is not rendered
		expect(queryByTestId(ADDRESS_LIST_ITEM_DELETE_BUTTON)).toBeNull();
	});

	it('should copy address to clipboard when copy button is clicked', async () => {
		const { getByTestId } = render(AddressItemActions, {
			props: { address: mockAddress },
			context: mockContext
		});

		// Find the copy button using test ID
		const copyButton = getByTestId(ADDRESS_LIST_ITEM_COPY_BUTTON);

		// Click the copy button
		await fireEvent.click(copyButton);

		// Check that copyToClipboard was called with the correct arguments
		expect(clipboardUtils.copyToClipboard).toHaveBeenCalledWith({
			text: en.wallet.text.address_copied,
			value: mockAddress.address
		});
	});

	it('should call onInfo when info button is clicked', async () => {
		const onInfo = vi.fn();

		const { getByTestId } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				onInfo
			},
			context: mockContext
		});

		// Find the info button using test ID
		const infoButton = getByTestId(ADDRESS_LIST_ITEM_INFO_BUTTON);

		// Click the info button
		await fireEvent.click(infoButton);

		// Check that onInfo was called
		expect(onInfo).toHaveBeenCalled();
	});

	it('should call onEdit when edit button is clicked', async () => {
		const onEdit = vi.fn();

		const { getByTestId } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				onEdit
			},
			context: mockContext
		});

		// Find the edit button using test ID
		const editButton = getByTestId(ADDRESS_LIST_ITEM_EDIT_BUTTON);

		// Click the edit button
		await fireEvent.click(editButton);

		// Check that onEdit was called
		expect(onEdit).toHaveBeenCalled();
	});

	it('should call onDelete when delete button is clicked', async () => {
		const onDelete = vi.fn();

		const { getByTestId } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				onDelete
			},
			context: mockContext
		});

		// Find the delete button using test ID
		const deleteButton = getByTestId(ADDRESS_LIST_ITEM_DELETE_BUTTON);

		// Click the delete button
		await fireEvent.click(deleteButton);

		// Check that onDelete was called
		expect(onDelete).toHaveBeenCalled();
	});

	it('should apply custom style class', () => {
		const customClass = 'custom-style-class';

		const { container } = render(AddressItemActions, {
			props: {
				address: mockAddress,
				styleClass: customClass
			},
			context: mockContext
		});

		// Check that the custom class is applied to the div
		const div = container.querySelector('div');

		expect(div?.classList.contains(customClass)).toBeTruthy();
	});
});
