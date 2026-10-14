import Modal from '$lib/components/ui/Modal.svelte';
import { createMockSnippet, mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('Modal', () => {
	const baseProps = { title: createMockSnippet('modal-title-content'), children: mockSnippet };

	// The close button's tap area is capped sideways only when a header action actually renders
	// right before it, not merely because a headerRight snippet was passed (it may render nothing).
	it('keeps the close button its full tap area when no header action sits before it', () => {
		const { getByTestId } = render(Modal, { props: baseProps });

		const close = getByTestId('close-modal');

		expect(close).toHaveClass('hit-area', 'not-first:[--hit-area-x:0px]');
		expect(close.matches(':first-child')).toBeTruthy();
	});

	it('caps the close button sideways when a header action renders before it', () => {
		const { getByTestId } = render(Modal, {
			props: { ...baseProps, headerRight: createMockSnippet('modal-header-action') }
		});

		expect(getByTestId('close-modal').matches(':first-child')).toBeFalsy();
	});
});
