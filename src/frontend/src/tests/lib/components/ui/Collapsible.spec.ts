import CollapsibleTest from '$tests/lib/components/ui/CollapsibleTest.svelte';
import { render, waitFor } from '@testing-library/svelte';

describe('Collapsible', () => {
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
