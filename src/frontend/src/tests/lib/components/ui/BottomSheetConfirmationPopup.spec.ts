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
});
