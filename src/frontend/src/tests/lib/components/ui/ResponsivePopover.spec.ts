import { render, waitFor } from '@testing-library/svelte';
import ResponsivePopoverTest from './ResponsivePopoverTest.svelte';

describe('ResponsivePopover', () => {
	const setWindowWidth = (width: number) => {
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: width
		});
		window.dispatchEvent(new Event('resize'));
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('displays popover on large screens', async () => {
		const { queryByTestId } = render(ResponsivePopoverTest);

		setWindowWidth(1000);

		await waitFor(() => {
			const popover = queryByTestId('popover-content');
			const bottomSheet = queryByTestId('bottom-sheet');

			expect(popover).toBeInTheDocument();
			expect(bottomSheet).not.toBeInTheDocument();
		});
	});

	it('displays bottom sheet on small screens', async () => {
		const { queryByTestId } = render(ResponsivePopoverTest);

		setWindowWidth(100);

		await waitFor(() => {
			const popover = queryByTestId('popover-content');
			const bottomSheet = queryByTestId('bottom-sheet');

			expect(bottomSheet).toBeInTheDocument();
			expect(popover).not.toBeInTheDocument();
		});
	});
});
