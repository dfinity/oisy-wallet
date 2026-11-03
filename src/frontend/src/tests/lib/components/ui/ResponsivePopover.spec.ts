import { screensStore } from '$lib/stores/screens.store';
import ResponsivePopoverTest from '$tests/lib/components/ui/ResponsivePopoverTest.svelte';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

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

	it('keeps only the bottom sheet, with focus in it, when an open sheet grows from xs to sm', async () => {
		const { queryByTestId } = render(ResponsivePopoverTest);

		screensStore.set('xs');

		await waitFor(() => expect(queryByTestId('bottom-sheet')).toBeInTheDocument());

		screensStore.set('sm');
		// Let the screen change render before asserting what is absent.
		await tick();

		const bottomSheet = queryByTestId('bottom-sheet');

		expect(bottomSheet).toBeInTheDocument();
		expect(queryByTestId('popover-content')).not.toBeInTheDocument();
		expect(bottomSheet?.contains(document.activeElement)).toBeTruthy();
	});

	it('switches to the popover from md', async () => {
		const { queryByTestId } = render(ResponsivePopoverTest);

		screensStore.set('md');

		await waitFor(() => {
			expect(queryByTestId('popover-content')).toBeInTheDocument();
			expect(queryByTestId('bottom-sheet')).not.toBeInTheDocument();
		});
	});

	it('passes the dropdown layout on to the popover', async () => {
		screensStore.set('lg');

		render(ResponsivePopoverTest, { props: { dropdown: true } });

		await waitFor(() => expect(document.querySelector('.wrapper.dropdown')).not.toBeNull());
	});
});
