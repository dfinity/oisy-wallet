import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
import { CONFIRMATION_POPUP_MODAL } from '$lib/constants/test-ids.constants';
import { screensStore } from '$lib/stores/screens.store';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

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
});
