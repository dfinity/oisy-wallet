import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
import SegmentedControlTest from '$tests/lib/components/ui/SegmentedControlTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('SegmentedControl', () => {
	const options = [
		{ value: 'principal', label: 'Principal', testId: 'segment-principal' },
		{ value: 'account-id', label: 'Account ID', testId: 'segment-account-id' },
		{ value: 'other', label: 'Other', testId: 'segment-other' }
	];

	const props = { options, value: 'principal', ariaLabel: 'Address format' };

	it('should render a radio group with the value checked and only it in the tab order', () => {
		const { getByRole, getAllByRole } = render(SegmentedControl, { props });

		expect(getByRole('radiogroup', { name: 'Address format' })).toBeInTheDocument();

		const [principal, accountId, other] = getAllByRole('radio');

		expect(principal).toHaveAttribute('aria-checked', 'true');
		expect(principal).toHaveAttribute('tabindex', '0');
		expect(accountId).toHaveAttribute('aria-checked', 'false');
		expect(accountId).toHaveAttribute('tabindex', '-1');
		expect(other).toHaveAttribute('tabindex', '-1');
	});

	it('should select a segment on click', async () => {
		const { getByRole } = render(SegmentedControl, { props });

		await fireEvent.click(getByRole('radio', { name: 'Account ID' }));

		expect(getByRole('radio', { name: 'Account ID' })).toHaveAttribute('aria-checked', 'true');
		expect(getByRole('radio', { name: 'Principal' })).toHaveAttribute('aria-checked', 'false');
	});

	it('should move and select with the arrow keys, wrapping at the ends, and jump with Home and End', async () => {
		const { getByRole } = render(SegmentedControl, { props });

		const radio = (name: string) => getByRole('radio', { name });

		await fireEvent.keyDown(radio('Principal'), { key: 'ArrowRight' });

		expect(radio('Account ID')).toHaveAttribute('aria-checked', 'true');
		expect(document.activeElement).toBe(radio('Account ID'));

		await fireEvent.keyDown(radio('Account ID'), { key: 'End' });

		expect(radio('Other')).toHaveAttribute('aria-checked', 'true');

		await fireEvent.keyDown(radio('Other'), { key: 'ArrowRight' });

		expect(radio('Principal')).toHaveAttribute('aria-checked', 'true');

		await fireEvent.keyDown(radio('Principal'), { key: 'ArrowLeft' });

		expect(radio('Other')).toHaveAttribute('aria-checked', 'true');

		await fireEvent.keyDown(radio('Other'), { key: 'Home' });

		expect(radio('Principal')).toHaveAttribute('aria-checked', 'true');
		expect(document.activeElement).toBe(radio('Principal'));
	});

	it('should leave other keys to the page', async () => {
		const { getByRole } = render(SegmentedControl, { props });

		await fireEvent.keyDown(getByRole('radio', { name: 'Principal' }), { key: 'Enter' });

		expect(getByRole('radio', { name: 'Principal' })).toHaveAttribute('aria-checked', 'true');
	});

	it('should hand the chosen value to the parent through the binding', async () => {
		const { getByRole, getByTestId } = render(SegmentedControlTest, { props });

		expect(getByTestId('segmented-control-value')).toHaveTextContent('principal');

		await fireEvent.click(getByRole('radio', { name: 'Account ID' }));

		expect(getByTestId('segmented-control-value')).toHaveTextContent('account-id');

		await fireEvent.keyDown(getByRole('radio', { name: 'Account ID' }), { key: 'End' });

		expect(getByTestId('segmented-control-value')).toHaveTextContent('other');
	});
});
