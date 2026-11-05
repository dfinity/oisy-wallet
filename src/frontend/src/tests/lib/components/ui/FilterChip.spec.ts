import FilterChip from '$lib/components/ui/FilterChip.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('FilterChip', () => {
	const testId = 'filter-chip';

	const props = {
		label: 'Bitcoin',
		clearAriaLabel: 'Clear network filter',
		testId,
		onClick: vi.fn(),
		onClear: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('names its trigger after the value it shows', () => {
		const { getByRole } = render(FilterChip, { props });

		expect(getByRole('button', { name: 'Bitcoin' })).toBeInTheDocument();
	});

	it('is a dropdown trigger, with its open state', async () => {
		const { getByTestId, rerender } = render(FilterChip, { props });

		const trigger = getByTestId(`${testId}-trigger`);

		expect(trigger).toHaveClass('dropdown-button');

		await fireEvent.click(trigger);

		expect(props.onClick).toHaveBeenCalledOnce();

		await rerender({ ...props, opened: true });

		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(trigger).toHaveClass('opened');
	});

	it('offers no clear button while nothing is picked', () => {
		const { getByTestId } = render(FilterChip, { props });

		// jsdom keeps `inert` as a property only; browsers reflect it to the attribute.
		expect(getByTestId(`${testId}-clear`)).toHaveProperty('inert', true);
		expect(getByTestId(`${testId}-trigger`)).not.toHaveClass('has-value');
	});

	it('clears the value and moves focus to the trigger', async () => {
		const { getByRole, getByTestId } = render(FilterChip, {
			props: { ...props, hasValue: true }
		});

		expect(getByTestId(`${testId}-trigger`)).toHaveClass('has-value');

		await fireEvent.click(getByRole('button', { name: props.clearAriaLabel }));

		expect(props.onClear).toHaveBeenCalledOnce();
		expect(getByTestId(`${testId}-trigger`)).toHaveFocus();
	});
});
