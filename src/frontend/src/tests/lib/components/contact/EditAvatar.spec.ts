import EditAvatar from '$lib/components/contact/EditAvatar.svelte';
import {
	CONTACT_POPOVER_MENU,
	CONTACT_POPOVER_MENU_ITEM,
	CONTACT_POPOVER_TRIGGER
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('EditAvatar', () => {
	const mockReplaceImage = vi.fn();
	const mockRemoveImage = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the trigger button with pencil icon', () => {
		const { getByTestId } = render(EditAvatar, {
			props: {
				onReplaceImage: mockReplaceImage,
				onRemoveImage: mockRemoveImage
			}
		});

		const button = getByTestId(CONTACT_POPOVER_TRIGGER);
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('aria-label', en.address_book.edit_avatar.replace_image);
	});

	it('should open popover when button is clicked', async () => {
		const { getByTestId } = render(EditAvatar, {
			props: {
				onReplaceImage: mockReplaceImage,
				onRemoveImage: mockRemoveImage
			}
		});

		await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
		expect(getByTestId(CONTACT_POPOVER_MENU)).toBeInTheDocument();
	});

	describe('when no image is set', () => {
		it('should show only upload option', async () => {
			const { getByTestId, getAllByTestId } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl: undefined
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			const menuItems = getAllByTestId(CONTACT_POPOVER_MENU_ITEM);
			expect(menuItems).toHaveLength(1);
			expect(menuItems[0]).toHaveTextContent(en.address_book.edit_avatar.upload_image);
		});

		it('should call onReplaceImage when upload is clicked', async () => {
			const { getByTestId, getByText } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl: undefined
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(getByText(en.address_book.edit_avatar.upload_image));
			expect(mockReplaceImage).toHaveBeenCalled();
		});
	});

	describe('when image is set', () => {
		const imageUrl = 'https://example.com/image.jpg';

		it('should show both replace and remove options', async () => {
			const { getByTestId, getAllByTestId } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			const menuItems = getAllByTestId(new RegExp(`${CONTACT_POPOVER_MENU_ITEM}|IconTrash`));
			expect(menuItems).toHaveLength(2);
		});

		it('should call onReplaceImage when replace is clicked', async () => {
			const { getByTestId, getByText } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(getByText(en.address_book.edit_avatar.replace_image));
			expect(mockReplaceImage).toHaveBeenCalled();
		});

		it('should call onRemoveImage when remove is clicked', async () => {
			const { getByTestId, getByText } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(getByText(en.address_book.edit_avatar.remove_image));
			expect(mockRemoveImage).toHaveBeenCalled();
		});
	});

	it('should display correct menu title', async () => {
		const { getByTestId, getByText } = render(EditAvatar, {
			props: {
				onReplaceImage: mockReplaceImage,
				onRemoveImage: mockRemoveImage
			}
		});

		await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
		expect(getByText(en.address_book.edit_avatar.menu_title)).toBeInTheDocument();
	});

	it('should have proper accessibility attributes', async () => {
		const { getByTestId } = render(EditAvatar, {
			props: {
				onReplaceImage: mockReplaceImage,
				onRemoveImage: mockRemoveImage
			}
		});

		const button = getByTestId(CONTACT_POPOVER_TRIGGER);
		expect(button).toHaveAttribute('aria-label', en.address_book.edit_avatar.replace_image);

		await fireEvent.click(button);
		const menu = getByTestId(CONTACT_POPOVER_MENU);
		expect(menu).toHaveAttribute('role', 'menu');
	});

	it('should apply correct styling classes', async () => {
		const { getByTestId } = render(EditAvatar, {
			props: {
				onReplaceImage: mockReplaceImage,
				onRemoveImage: mockRemoveImage
			}
		});

		await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
		const popover = getByTestId(CONTACT_POPOVER_MENU);
		expect(popover).toHaveClass('min-w-60');
		expect(popover).toHaveClass('max-w-[60%]');
	});
});
