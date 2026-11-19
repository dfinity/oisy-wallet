import { screensStore } from '$lib/stores/screens.store';
import ResponsivePopoverTest from '$tests/lib/components/ui/ResponsivePopoverTest.svelte';
import en from '$tests/mocks/i18n.mock';
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

	it('puts the title above the popover content', async () => {
		screensStore.set('lg');

		const { getByTestId } = render(ResponsivePopoverTest, { props: { title: 'Popover title' } });

		await waitFor(() =>
			expect(getByTestId('popover-content')).toHaveTextContent(
				/^\s*Popover title\s*Test content\s*$/
			)
		);
	});

	it('puts the title on the sheet header row', async () => {
		screensStore.set('xs');

		const { getByText } = render(ResponsivePopoverTest, { props: { title: 'Sheet title' } });

		await waitFor(() =>
			expect(getByText('Sheet title').nextElementSibling).toHaveAttribute(
				'aria-label',
				en.core.alt.close_details
			)
		);
	});

	it.each(['xs', 'lg'] as const)(
		'names the dialog by its title without an ariaLabel on %s screens',
		async (size) => {
			screensStore.set(size);

			const { getByRole } = render(ResponsivePopoverTest, { props: { title: 'Dialog title' } });

			await waitFor(() => expect(getByRole('dialog')).toHaveAccessibleName('Dialog title'));
		}
	);

	it('replaces the sheet minimum height with sheetContentClass', async () => {
		screensStore.set('xs');

		const { getByText } = render(ResponsivePopoverTest, { props: { sheetContentClass: 'pb-2' } });

		await waitFor(() => expect(getByText('Test content')).toHaveClass('pb-2'));

		expect(getByText('Test content')).not.toHaveClass('min-h-[30vh]');
	});

	it('passes the dropdown layout on to the popover', async () => {
		screensStore.set('lg');

		render(ResponsivePopoverTest, { props: { dropdown: true } });

		await waitFor(() => expect(document.querySelector('.wrapper.dropdown')).not.toBeNull());
	});
});
