import Modal from '$lib/components/ui/Modal.svelte';
import { busy } from '$lib/stores/busy.store';
import { createMockSnippet, mockSnippet } from '$tests/mocks/snippet.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';

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

	it('preserves the autofocus of a child input when the modal mounts', async () => {
		const { getByTestId } = render(Modal, {
			props: {
				...baseProps,
				children: createRawSnippet(() => ({
					render: () => '<input data-tid="autofocus-field" />'
				}))
			}
		});
		// Simulate the child's mount autofocus before the overlay's deferred fallback.
		getByTestId('autofocus-field').focus();
		await tick();

		expect(document.activeElement).toBe(getByTestId('autofocus-field'));
	});

	it('ignores Escape while busy and restores the opener after dismissal', async () => {
		const trigger = document.createElement('button');
		document.body.append(trigger);
		trigger.focus();
		const onClose = vi.fn();
		const { unmount } = render(Modal, { props: { ...baseProps, onClose } });
		await tick();
		busy.start();
		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).not.toHaveBeenCalled();

		busy.stop();
		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).toHaveBeenCalledOnce();

		unmount();

		expect(document.activeElement).toBe(trigger);

		trigger.remove();
	});
});
