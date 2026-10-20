import DropdownButton from '$lib/components/ui/DropdownButton.svelte';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { fireEvent, render } from '@testing-library/svelte';

const ariaLabel = 'Switch language';

const props = { ariaLabel, onClick: vi.fn(), children: mockSnippet };

describe('DropdownButton', () => {
	it('renders a closed trigger with a decorative chevron', () => {
		const { getByRole } = render(DropdownButton, { props });

		const button = getByRole('button', { name: ariaLabel });

		expect(button).toHaveClass('dropdown-button');
		expect(button).toHaveAttribute('type', 'button');
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(button.querySelector('.dropdown-chevron')).toHaveAttribute('aria-hidden', 'true');
	});

	it('takes its border colour from the shared style, not a utility in the markup', () => {
		const { getByRole } = render(DropdownButton, { props: { ...props, border: true } });

		const button = getByRole('button', { name: ariaLabel });

		expect(button).toHaveClass('border');
		expect([...button.classList].filter((name) => name.startsWith('border-'))).toEqual([]);
	});

	it('shows and announces the open state', () => {
		const { getByRole } = render(DropdownButton, { props: { ...props, opened: true } });

		const button = getByRole('button', { name: ariaLabel });

		expect(button).toHaveClass('opened');
		expect(button).toHaveAttribute('aria-expanded', 'true');
	});

	it('renders as disabled when asked', () => {
		const { getByRole } = render(DropdownButton, { props: { ...props, disabled: true } });

		expect(getByRole('button', { name: ariaLabel })).toBeDisabled();
	});

	it('calls onClick when clicked', async () => {
		const onClick = vi.fn();
		const { getByRole } = render(DropdownButton, { props: { ...props, onClick } });

		await fireEvent.click(getByRole('button', { name: ariaLabel }));

		expect(onClick).toHaveBeenCalledOnce();
	});
});
