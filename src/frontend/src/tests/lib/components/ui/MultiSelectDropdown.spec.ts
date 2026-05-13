import { MULTI_SELECT_DROPDOWN_PANEL_SHELL } from '$lib/constants/test-ids.constants';
import { screensStore } from '$lib/stores/screens.store';
import MultiSelectDropdownTest from '$tests/lib/components/ui/MultiSelectDropdownTest.svelte';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('MultiSelectDropdown', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		screensStore.set('lg');
	});

	it('renders the trigger button with the supplied label and ariaLabel', () => {
		const { getByTestId, getByText } = render(MultiSelectDropdownTest);

		const trigger = getByTestId('multi-select-dropdown');

		expect(trigger).toHaveAttribute('aria-label', 'Filter');
		expect(getByText('Filter')).toBeInTheDocument();
	});

	it('does not render the count badge when count is zero', () => {
		const { queryByText } = render(MultiSelectDropdownTest);

		expect(queryByText('0')).not.toBeInTheDocument();
	});

	it('renders the count badge when count is greater than zero', () => {
		const { getByText } = render(MultiSelectDropdownTest, { props: { count: 3 } });

		expect(getByText('3')).toBeInTheDocument();
	});

	it('opens the panel on click', async () => {
		const { getByTestId, queryByTestId } = render(MultiSelectDropdownTest);

		expect(queryByTestId('multi-select-dropdown-panel')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('multi-select-dropdown'));

		await waitFor(() => {
			expect(queryByTestId('multi-select-dropdown-panel')).toBeInTheDocument();
		});
	});

	it('renders the search input only when searchable is true', async () => {
		const { getByTestId, queryByPlaceholderText } = render(MultiSelectDropdownTest, {
			props: { searchable: true }
		});

		await fireEvent.click(getByTestId('multi-select-dropdown'));

		await waitFor(() => {
			expect(queryByPlaceholderText('Search items')).toBeInTheDocument();
		});
	});

	it('does not render the search input when searchable is false', async () => {
		const { getByTestId, queryByPlaceholderText } = render(MultiSelectDropdownTest);

		await fireEvent.click(getByTestId('multi-select-dropdown'));

		await waitFor(() => {
			expect(queryByPlaceholderText('Search items')).not.toBeInTheDocument();
		});
	});

	it('uses default panel width classes when panelWidthClass is omitted', async () => {
		const { getByTestId } = render(MultiSelectDropdownTest);

		await fireEvent.click(getByTestId('multi-select-dropdown'));

		await waitFor(() => {
			const shell = getByTestId(MULTI_SELECT_DROPDOWN_PANEL_SHELL);

			expect(shell.className).toContain('w-full');
			expect(shell.className).toContain('min-w-60');
		});
	});

	it('applies panelWidthClass instead of default width classes when provided', async () => {
		const { getByTestId } = render(MultiSelectDropdownTest, {
			props: { panelWidthClass: 'w-full sm:w-80' }
		});

		await fireEvent.click(getByTestId('multi-select-dropdown'));

		await waitFor(() => {
			const shell = getByTestId(MULTI_SELECT_DROPDOWN_PANEL_SHELL);

			expect(shell.className).toContain('w-full');
			expect(shell.className).toContain('sm:w-80');
			expect(shell.className).not.toContain('min-w-60');
		});
	});
});
