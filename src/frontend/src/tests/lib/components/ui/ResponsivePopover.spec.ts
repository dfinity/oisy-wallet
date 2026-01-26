import { screensStore } from '$lib/stores/screens.store';
import ResponsivePopoverTest from '$tests/lib/components/ui/ResponsivePopoverTest.svelte';
import { render, waitFor } from '@testing-library/svelte';

describe('ResponsivePopover', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('displays popover on large screens', async () => {
		const { queryByTestId } = render(ResponsivePopoverTest);

		screensStore.set('lg');

		await waitFor(() => {
			const popover = queryByTestId('popover-content');
			const bottomSheet = queryByTestId('bottom-sheet');

			expect(popover).toBeInTheDocument();
			expect(bottomSheet).not.toBeInTheDocument();
		});
	});

	it('displays bottom sheet on small screens', async () => {
		const { queryByTestId } = render(ResponsivePopoverTest);

		screensStore.set('xs');

		await waitFor(() => {
			const popover = queryByTestId('popover-content');
			const bottomSheet = queryByTestId('bottom-sheet');

			expect(bottomSheet).toBeInTheDocument();
			expect(popover).not.toBeInTheDocument();
		});
	});
});
