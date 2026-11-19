import Busy from '$lib/components/ui/Busy.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { overlayFocus } from '$lib/utils/overlay.utils';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('Busy', () => {
	beforeEach(() => {
		busy.stop();
	});

	afterEach(() => {
		cleanup();

		busy.stop();
	});

	it('should not render when busy store is null', () => {
		const { container } = render(Busy);

		expect(container.querySelector('.busy')).not.toBeInTheDocument();
	});

	it('should render busy overlay when busy store has value', () => {
		busy.start();

		const { container } = render(Busy);

		expect(container.querySelector('.busy')).toBeInTheDocument();
	});

	it('should render spinner by default', () => {
		busy.start();

		const { container } = render(Busy);

		expect(container.querySelector('.spinner')).toBeInTheDocument();
	});

	it('should render message when msg is provided', () => {
		const message = 'Loading data...';
		busy.start({ msg: message });

		const { getByText } = render(Busy);

		expect(getByText(message)).toBeInTheDocument();
	});

	it('should not render message when msg is null', () => {
		busy.start();

		const { container } = render(Busy);

		expect(container.querySelector('p')).not.toBeInTheDocument();
	});

	it('should not render cancel button when using start', () => {
		busy.start();

		const { queryByText } = render(Busy);

		expect(queryByText(get(i18n).core.text.cancel)).not.toBeInTheDocument();
	});

	it('should not add close class when close is false', () => {
		busy.start();

		const { container } = render(Busy);

		const busyElement = container.querySelector('.busy');

		expect(busyElement).not.toHaveClass('close');
	});

	it('keeps the browser focus ring off the overlay', () => {
		busy.start();

		const { container } = render(Busy);

		expect(container.querySelector('.busy')).toHaveClass('outline-none');
	});

	it('should not close when overlay is clicked and close is false', async () => {
		busy.start();

		const { container } = render(Busy);

		const overlay = container.querySelector('.busy');

		expect(overlay).toBeInTheDocument();

		if (overlay) {
			await fireEvent.click(overlay);

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(get(busy)).not.toBeNull();
		}
	});

	it('should not close when Escape key is pressed and close is false', async () => {
		busy.start();

		const { container } = render(Busy);

		const overlay = container.querySelector('.busy');

		expect(overlay).toBeInTheDocument();

		if (overlay) {
			await fireEvent.keyDown(overlay, { key: 'Escape' });

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(get(busy)).not.toBeNull();
		}
	});

	it('should handle transition fade in', async () => {
		const { container } = render(Busy);

		busy.start();

		await waitFor(() => {
			expect(container.querySelector('.busy')).toBeInTheDocument();
		});
	});

	it('should handle transition fade out', async () => {
		busy.start();

		const { container } = render(Busy);

		expect(container.querySelector('.busy')).toBeInTheDocument();

		busy.stop();

		await waitFor(
			() => {
				expect(container.querySelector('.busy')).not.toBeInTheDocument();
			},
			{ timeout: 300 }
		);
	});

	it('should handle keyboard close when close is not set', async () => {
		busy.start();

		const { container } = render(Busy);

		const overlay = container.querySelector('.busy');

		if (overlay) {
			await fireEvent.keyDown(overlay, { key: 'Escape' });

			expect(get(busy)).not.toBeNull();
		}
	});

	it.each([true, false])(
		'keeps focus above a later-mounted modal when cancellable is %s',
		async (cancellable) => {
			const trigger = document.createElement('button');
			document.body.append(trigger);
			trigger.focus();
			if (cancellable) {
				busy.show();
			} else {
				busy.start();
			}
			const busyRender = render(Busy);
			await tick();
			const busyDialog = busyRender.getByRole('dialog');
			const busyFocus = document.activeElement;
			const onClose = vi.fn();
			const modalRender = render(Modal, { title: mockSnippet, children: mockSnippet, onClose });
			try {
				await tick();

				expect(document.activeElement).toBe(busyFocus);

				const modalClose = modalRender.getByTestId('close-modal');
				modalClose.focus();

				expect(busyDialog.contains(document.activeElement)).toBeTruthy();

				for (const shiftKey of [false, true]) {
					await fireEvent.keyDown(window, { key: 'Tab', shiftKey });

					expect(document.activeElement).toBe(busyFocus);
				}
				await fireEvent.keyDown(window, { key: 'Escape' });

				expect(onClose).not.toHaveBeenCalled();

				if (cancellable) {
					expect(get(busy)).toBeUndefined();
				} else {
					expect(get(busy)).toBeDefined();

					busy.stop();
				}
				await waitFor(() => expect(document.activeElement).toBe(modalClose));
				await fireEvent.keyDown(window, { key: 'Escape' });

				expect(onClose).toHaveBeenCalledOnce();

				modalRender.unmount();

				expect(document.activeElement).toBe(trigger);
			} finally {
				modalRender.unmount();
				busyRender.unmount();
				trigger.remove();
			}
		}
	);

	it('keeps Cancel reachable above a modal and handles Escape itself', async () => {
		const parent = document.createElement('div');
		parent.innerHTML = '<button>Parent</button>';
		document.body.append(parent);
		const closeParent = vi.fn();
		const parentAction = overlayFocus(parent, { onClose: closeParent });
		await tick();
		busy.show();
		const { getByRole, unmount } = render(Busy);
		await tick();

		expect(document.activeElement).toBe(getByRole('button', { name: get(i18n).core.text.close }));

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(get(busy)).toBeUndefined();
		expect(closeParent).not.toHaveBeenCalled();

		unmount();
		parentAction.destroy();
		parent.remove();
	});
});
