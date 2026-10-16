import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
import { CONFIRMATION_POPUP_MODAL } from '$lib/constants/test-ids.constants';
import { screensStore } from '$lib/stores/screens.store';
import { overlayFocus } from '$lib/utils/overlay.utils';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('BottomSheetConfirmationPopup', () => {
	const props = {
		onCancel: () => {},
		title: createMockSnippet('confirmation-title'),
		content: createMockSnippet('confirmation-content')
	};

	it('renders a slide-up bottom sheet on mobile screens', () => {
		screensStore.set('xs');

		const { queryByTestId } = render(BottomSheetConfirmationPopup, { props });

		expect(queryByTestId('bottom-sheet')).toBeInTheDocument();
		expect(queryByTestId(CONFIRMATION_POPUP_MODAL)).toBeNull();
	});

	it('renders a centered modal card on desktop screens', () => {
		screensStore.set('1.5lg');

		const { queryByTestId, getByTestId } = render(BottomSheetConfirmationPopup, { props });

		const modal = getByTestId(CONFIRMATION_POPUP_MODAL);

		expect(modal).toBeInTheDocument();
		expect(modal).toHaveAttribute('role', 'dialog');
		expect(modal).toHaveAttribute('aria-modal', 'true');

		expect(queryByTestId('bottom-sheet')).toBeNull();
		expect(getByTestId('confirmation-title')).toBeInTheDocument();
		expect(getByTestId('confirmation-content')).toBeInTheDocument();
	});

	it('renders a centered modal card at the same breakpoint as Modal.svelte (>=640px)', () => {
		// Regression: Modal.svelte's own dialog becomes a centered card at the `sm`
		// breakpoint (640px, see gix.scss). This popup used to only switch at 1024px,
		// so it rendered as a mobile bottom sheet while the parent modal already
		// looked like a desktop dialog.
		screensStore.set('md');

		const { queryByTestId, getByTestId } = render(BottomSheetConfirmationPopup, { props });

		expect(getByTestId(CONFIRMATION_POPUP_MODAL)).toBeInTheDocument();
		expect(queryByTestId('bottom-sheet')).toBeNull();
	});

	it.each(['xs', '1.5lg'] as const)(
		'owns focus and Escape above a parent on %s',
		async (screen) => {
			screensStore.set(screen);
			const parent = document.createElement('div');
			parent.innerHTML = '<button>Parent</button>';
			document.body.append(parent);
			const closeParent = vi.fn();
			const parentAction = overlayFocus(parent, { onClose: closeParent });
			await tick();
			const onCancel = vi.fn();
			const { getByRole, rerender, unmount } = render(BottomSheetConfirmationPopup, {
				props: { ...props, onCancel }
			});
			await tick();

			expect(getByRole('dialog').contains(document.activeElement)).toBeTruthy();

			await fireEvent.keyDown(window, { key: 'Escape' });

			expect(onCancel).toHaveBeenCalledOnce();
			expect(closeParent).not.toHaveBeenCalled();

			await rerender({ ...props, onCancel, disabled: true });
			await fireEvent.keyDown(window, { key: 'Escape' });

			expect(onCancel).toHaveBeenCalledOnce();

			unmount();

			expect(document.activeElement).toBe(parent.querySelector('button'));

			parentAction.destroy();
			parent.remove();
		}
	);
});
