import ModalFilterButton from '$lib/components/ui/ModalFilterButton.svelte';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { fireEvent, render } from '@testing-library/svelte';

const ariaLabel = 'All networks';

const props = { ariaLabel, onclick: vi.fn(), children: mockSnippet };

describe('ModalFilterButton', () => {
	it('renders a bordered dropdown trigger with a decorative chevron', () => {
		const { getByRole } = render(ModalFilterButton, { props });

		const button = getByRole('button', { name: ariaLabel });

		expect(button).toHaveClass('dropdown-button', 'border');
		expect([...button.classList].filter((name) => name.startsWith('border-'))).toEqual([]);
		expect(button.querySelector('.dropdown-chevron')).toHaveAttribute('aria-hidden', 'true');
	});

	it('shows no open state when it opens a step rather than a popover', () => {
		const { getByRole } = render(ModalFilterButton, { props });

		const button = getByRole('button', { name: ariaLabel });

		expect(button).not.toHaveClass('opened');
		expect(button).not.toHaveAttribute('aria-expanded');
	});

	it('shows and announces the open state when opened is set', () => {
		const { getByRole } = render(ModalFilterButton, { props: { ...props, opened: true } });

		const button = getByRole('button', { name: ariaLabel });

		expect(button).toHaveClass('opened');
		expect(button).toHaveAttribute('aria-expanded', 'true');
	});

	it('calls onclick when clicked', async () => {
		const onclick = vi.fn();
		const { getByRole } = render(ModalFilterButton, { props: { ...props, onclick } });

		await fireEvent.click(getByRole('button', { name: ariaLabel }));

		expect(onclick).toHaveBeenCalledOnce();
	});

	it('renders as disabled when asked', () => {
		const { getByRole } = render(ModalFilterButton, { props: { ...props, disabled: true } });

		expect(getByRole('button', { name: ariaLabel })).toBeDisabled();
	});
});
