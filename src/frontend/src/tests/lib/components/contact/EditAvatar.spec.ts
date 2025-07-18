import EditAvatar from '$lib/components/contact/EditAvatar.svelte';
import {
	CONTACT_POPOVER_MENU,
	CONTACT_POPOVER_MENU_ITEM,
	CONTACT_POPOVER_TRIGGER
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('EditAvatar', () => {
	const mockReplaceImage = vi.fn();
	const mockRemoveImage = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the trigger button with pencil icon', () => {
		render(EditAvatar, {
			props: {
				replaceImage: mockReplaceImage,
				removeImage: mockRemoveImage
			}
		});

		const button = screen.getByTestId(CONTACT_POPOVER_TRIGGER);
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('aria-label', 'Edit image');
	});

	it('should open popover when button is clicked', async () => {
		render(EditAvatar, {
			props: {
				replaceImage: mockReplaceImage,
				removeImage: mockRemoveImage
			}
		});

		await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));
		expect(screen.getByTestId(CONTACT_POPOVER_MENU)).toBeInTheDocument();
	});

	describe('when no image is set', () => {
		it('should show only upload option', async () => {
			render(EditAvatar, {
				props: {
					replaceImage: mockReplaceImage,
					removeImage: mockRemoveImage,
					imageUrl: undefined
				}
			});

			await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));

			const menuItems = screen.getAllByTestId(CONTACT_POPOVER_MENU_ITEM);
			expect(menuItems).toHaveLength(1);
			expect(menuItems[0]).toHaveTextContent(en.address_book.edit_avatar.upload_image);
		});

		it('should call replaceImage when upload is clicked', async () => {
			render(EditAvatar, {
				props: {
					replaceImage: mockReplaceImage,
					removeImage: mockRemoveImage,
					imageUrl: undefined
				}
			});

			await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(screen.getByText(en.address_book.edit_avatar.upload_image));

			expect(mockReplaceImage).toHaveBeenCalled();
		});
	});

	describe('when image is set', () => {
		it('should show both replace and remove options', async () => {
			render(EditAvatar, {
				props: {
					replaceImage: mockReplaceImage,
					removeImage: mockRemoveImage,
					imageUrl: 'https://example.com/image.jpg'
				}
			});

			await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));

			const menuItems = screen.getAllByTestId(new RegExp(`${CONTACT_POPOVER_MENU_ITEM}|IconTrash`));
			expect(menuItems).toHaveLength(2);

			expect(screen.getByText(en.address_book.edit_avatar.replace_image)).toBeInTheDocument();
			expect(screen.getByText(en.address_book.edit_avatar.remove_image)).toBeInTheDocument();
		});

		it('should call replaceImage when replace is clicked', async () => {
			render(EditAvatar, {
				props: {
					replaceImage: mockReplaceImage,
					removeImage: mockRemoveImage,
					imageUrl: 'https://example.com/image.jpg'
				}
			});

			await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(screen.getByText(en.address_book.edit_avatar.replace_image));

			expect(mockReplaceImage).toHaveBeenCalled();
		});

		it('should call removeImage when remove is clicked', async () => {
			render(EditAvatar, {
				props: {
					replaceImage: mockReplaceImage,
					removeImage: mockRemoveImage,
					imageUrl: 'https://example.com/image.jpg'
				}
			});

			await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(screen.getByText(en.address_book.edit_avatar.remove_image));

			expect(mockRemoveImage).toHaveBeenCalled();
		});
	});

	it('should display correct menu title', async () => {
		render(EditAvatar, {
			props: {
				replaceImage: mockReplaceImage,
				removeImage: mockRemoveImage
			}
		});

		await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));
		expect(screen.getByText(en.address_book.edit_avatar.menu_title)).toBeInTheDocument();
	});

	it('should have proper accessibility attributes', async () => {
		render(EditAvatar, {
			props: {
				replaceImage: mockReplaceImage,
				removeImage: mockRemoveImage
			}
		});

		const button = screen.getByTestId(CONTACT_POPOVER_TRIGGER);
		expect(button).toHaveAttribute('aria-label', 'Edit image');

		await fireEvent.click(button);
		const menu = screen.getByTestId(CONTACT_POPOVER_MENU);
		expect(menu).toHaveAttribute('role', 'menu');
	});

	it('should apply correct styling classes', async () => {
		render(EditAvatar, {
			props: {
				replaceImage: mockReplaceImage,
				removeImage: mockRemoveImage
			}
		});

		await fireEvent.click(screen.getByTestId(CONTACT_POPOVER_TRIGGER));

		const popover = screen.getByTestId(CONTACT_POPOVER_MENU);
		expect(popover).toHaveClass('min-w-60');
		expect(popover).toHaveClass('max-w-[60%]');
	});
});
