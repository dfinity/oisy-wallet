import EditAvatar from '$lib/components/contact/EditAvatar.svelte';
import {
	CONTACT_POPOVER_MENU,
	CONTACT_POPOVER_TRIGGER,
	CONTACT_REMOVE_MENU_ITEM,
	CONTACT_REPLACE_MENU_ITEM
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

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

	it('should open popover when trigger is clicked', async () => {
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
		it('should show only the upload option', async () => {
			const { getByTestId, queryByTestId } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl: null
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));

			expect(getByTestId(CONTACT_REPLACE_MENU_ITEM)).toBeInTheDocument();
			expect(queryByTestId(CONTACT_REMOVE_MENU_ITEM)).not.toBeInTheDocument();
		});

		it('should call onReplaceImage when upload is clicked', async () => {
			const { getByTestId } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl: null
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(getByTestId(CONTACT_REPLACE_MENU_ITEM));

			expect(mockReplaceImage).toHaveBeenCalled();
		});
	});

	describe('when image is set', () => {
		const imageUrl = 'https://example.com/image.jpg';

		it('should show both replace and remove options', async () => {
			const { getByTestId } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));

			expect(getByTestId(CONTACT_REPLACE_MENU_ITEM)).toBeInTheDocument();
			expect(getByTestId(CONTACT_REMOVE_MENU_ITEM)).toBeInTheDocument();
		});

		it('should call onReplaceImage when replace is clicked', async () => {
			const { getByTestId } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(getByTestId(CONTACT_REPLACE_MENU_ITEM));

			expect(mockReplaceImage).toHaveBeenCalled();
		});

		it('should call onRemoveImage when remove is clicked', async () => {
			const { getByTestId } = render(EditAvatar, {
				props: {
					onReplaceImage: mockReplaceImage,
					onRemoveImage: mockRemoveImage,
					imageUrl
				}
			});

			await fireEvent.click(getByTestId(CONTACT_POPOVER_TRIGGER));
			await fireEvent.click(getByTestId(CONTACT_REMOVE_MENU_ITEM));

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

	it('should apply correct accessibility attributes', async () => {
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

	it('should apply correct styling classes to popover', async () => {
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
