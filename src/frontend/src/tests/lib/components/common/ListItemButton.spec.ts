import ListItemButtonTest from '$tests/lib/components/common/ListItemButtonTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';

const LABEL = 'Choose me';

describe('ListItemButton', () => {
	it('renders the label via children snippet', () => {
		const { getByRole } = render(ListItemButtonTest, {
			onclick: vi.fn(),
			children: LABEL
		});

		expect(getByRole('button', { name: LABEL })).toBeInTheDocument();
	});

	it('calls onclick when clicked', async () => {
		const onClick = vi.fn();
		const { getByRole } = render(ListItemButtonTest, {
			onclick: onClick,
			children: LABEL
		});

		await fireEvent.click(getByRole('button', { name: LABEL }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it('forwards testId to the underlying Button element', () => {
		const testId = 'row-1';
		const { container } = render(ListItemButtonTest, {
			onclick: vi.fn(),
			children: LABEL,
			testId
		});

		// The base Button uses data-tid
		const el = container.querySelector(`[data-tid="${testId}"]`);

		expect(el).toBeInTheDocument();
	});

	it('does not render the check icon when selectable is not set', () => {
		const testId = 'row-no-selectable';
		const { container } = render(ListItemButtonTest, {
			onclick: vi.fn(),
			children: LABEL,
			testId
		});

		const host = container.querySelector(`[data-tid="${testId}"]`);

		expect(host?.querySelector('svg')).not.toBeInTheDocument();
	});

	it('renders selectable wrapper but no icon when selected=false', () => {
		const testId = 'row-unselected';
		const { container } = render(ListItemButtonTest, {
			onclick: vi.fn(),
			children: LABEL,
			selectable: true,
			selected: false,
			testId
		});

		const host = container.querySelector(`[data-tid="${testId}"]`);
		const selectableSpan = host?.querySelector('span.w-\\[20px\\]');

		expect(selectableSpan).toBeInTheDocument();

		expect(host?.querySelector('svg')).not.toBeInTheDocument();
	});

	it('renders the check icon when selectable=true and selected=true', () => {
		const testId = 'row-selected';
		const { container } = render(ListItemButtonTest, {
			onclick: vi.fn(),
			children: LABEL,
			selectable: true,
			selected: true,
			testId
		});

		const host = container.querySelector(`[data-tid="${testId}"]`);

		expect(host?.querySelector('svg')).toBeInTheDocument();
	});
});
