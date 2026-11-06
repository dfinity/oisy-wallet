import FilterChip from '$lib/components/ui/FilterChip.svelte';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { openFilterChip } from '$tests/utils/filter-chip.test-utils';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';

describe('FilterChip', () => {
	const testId = 'filter-chip';

	const props = {
		label: 'Bitcoin',
		panelLabel: 'Filter networks',
		clearAriaLabel: 'Clear network filter',
		testId,
		onClear: vi.fn(),
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('names its trigger after the value it shows', () => {
		render(FilterChip, { props });

		expect(screen.getByRole('button', { name: 'Bitcoin' })).toHaveClass('dropdown-button');
	});

	it('opens its options in a named panel and shows the open state', async () => {
		render(FilterChip, { props });

		const panel = await openFilterChip(testId);

		expect(panel).toContainElement(screen.getByTestId(mockSnippetTestId));
		expect(screen.getByRole('dialog')).toHaveAccessibleName(props.panelLabel);
		expect(screen.getByTestId(`${testId}-trigger`)).toHaveAttribute('aria-expanded', 'true');
	});

	it('hands focus back to the trigger when Escape closes the panel', async () => {
		render(FilterChip, { props });

		await openFilterChip(testId);

		await fireEvent.keyDown(document, { key: 'Escape' });

		await waitFor(() => expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument());

		expect(screen.getByTestId(`${testId}-trigger`)).toHaveFocus();
	});

	it('offers no clear button while nothing is picked', () => {
		render(FilterChip, { props });

		// jsdom keeps `inert` as a property only; browsers reflect it to the attribute.
		expect(screen.getByTestId(`${testId}-clear`)).toHaveProperty('inert', true);
		expect(screen.getByTestId(`${testId}-trigger`)).not.toHaveClass('has-value');
	});

	it('clears the value and moves focus to the trigger', async () => {
		render(FilterChip, { props: { ...props, hasValue: true } });

		await fireEvent.click(screen.getByRole('button', { name: props.clearAriaLabel }));

		expect(props.onClear).toHaveBeenCalledOnce();
		expect(screen.getByTestId(`${testId}-trigger`)).toHaveFocus();
	});
});
