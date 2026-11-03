import CollapsibleTest from '$tests/lib/components/ui/CollapsibleTest.svelte';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('Collapsible', () => {
	it('disables click and keyboard expansion and restores them when enabled', async () => {
		const { getByTestId, rerender } = render(CollapsibleTest, {
			props: { onSubmit: vi.fn(), disabled: true, initiallyExpanded: true }
		});
		const header = getByTestId('collapsible-header');

		expect(header).toHaveAttribute('aria-disabled', 'true');
		expect(header).toHaveAttribute('tabindex', '-1');
		expect(getByTestId('collapsible-expand-button')).toBeDisabled();

		await fireEvent.click(header);
		await fireEvent.keyPress(header, { key: 'Enter' });
		await fireEvent.keyPress(header, { key: ' ' });

		expect(getByTestId('collapsible-content')).not.toHaveClass('expanded');

		await rerender({ disabled: false });
		await fireEvent.click(header);

		expect(getByTestId('collapsible-content')).toHaveClass('expanded');
	});

	it('toggles without submitting a surrounding form', async () => {
		const onSubmit = vi.fn();

		const { getByTestId } = render(CollapsibleTest, { props: { onSubmit } });

		const toggle = getByTestId('collapsible-expand-button');

		// A bare <button> defaults to type="submit". Inside a form, expanding a section would submit
		// it and run the browser's validation over fields the user has not reached yet.
		expect(toggle).toHaveAttribute('type', 'button');

		toggle.click();

		await waitFor(() => {
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});
});
