import Busy from '$lib/components/ui/Busy.svelte';
import { busy } from '$lib/stores/busy.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Busy', () => {
	beforeEach(() => {
		busy.stop();
	});

	afterEach(() => {
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

		expect(queryByText('Cancel')).not.toBeInTheDocument();
	});

	it('should not add close class when close is false', () => {
		busy.start();

		const { container } = render(Busy);

		const busyElement = container.querySelector('.busy');

		expect(busyElement).not.toHaveClass('close');
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
});
