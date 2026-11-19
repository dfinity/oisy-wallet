import HelpToggle from '$lib/components/ui/HelpToggle.svelte';
import HelpToggleTestHost from '$tests/lib/components/ui/HelpToggleTestHost.svelte';
import en from '$tests/mocks/i18n.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('HelpToggle', () => {
	it('is an "Info" button with a tap area and an icon-size press', () => {
		const { getByRole } = render(HelpToggle, { props: { expanded: false, styleClass: 'ml-1' } });

		const toggle = getByRole('button', { name: en.core.text.info });

		expect(toggle).toHaveClass('hit-area', 'relative', 'press-icon', 'ml-1');
		expect(toggle).toHaveAttribute('type', 'button');
	});

	it('flips the bound state and says whether the explanation is open', async () => {
		const { getByRole, getByTestId } = render(HelpToggleTestHost);

		const toggle = getByRole('button', { name: en.core.text.info });

		expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('help-toggle-expanded')).toHaveTextContent('true');
	});

	// A Collapsible owns its open state: the toggle asks it to toggle rather than flipping its own.
	it('leaves the state to onToggle when one is given', async () => {
		const onToggle = vi.fn();

		const { getByRole } = render(HelpToggle, { props: { expanded: false, onToggle } });

		const toggle = getByRole('button', { name: en.core.text.info });

		await fireEvent.click(toggle);

		expect(onToggle).toHaveBeenCalledOnce();
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('takes its own label and icon', () => {
		const { getByRole, getByTestId } = render(HelpToggle, {
			props: { expanded: false, ariaLabel: 'Fill or kill', icon: createMockSnippet('custom-icon') }
		});

		expect(getByRole('button', { name: 'Fill or kill' })).toBeInTheDocument();
		expect(getByTestId('custom-icon')).toBeInTheDocument();
	});
});
