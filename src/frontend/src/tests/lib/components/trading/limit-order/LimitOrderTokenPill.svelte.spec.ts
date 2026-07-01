import LimitOrderTokenPill from '$lib/components/trading/limit-order/LimitOrderTokenPill.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('LimitOrderTokenPill', () => {
	it('renders the symbol when provided', () => {
		const { container } = render(LimitOrderTokenPill, {
			props: { symbol: 'ICP', onclick: () => {} }
		});

		expect(container).toHaveTextContent('ICP');
	});

	it('renders the select placeholder when no symbol is provided', () => {
		const { container } = render(LimitOrderTokenPill, {
			props: { onclick: () => {} }
		});

		expect(container).toHaveTextContent(get(i18n).core.text.select);
		expect(container.querySelector('button')?.className).toContain('border-dashed');
	});

	it('marks the button disabled when disabled is true', () => {
		const { container } = render(LimitOrderTokenPill, {
			props: { symbol: 'ICP', disabled: true, onclick: () => {} }
		});

		const button = container.querySelector('button');

		expect(button).toBeDisabled();
		expect(button?.className).toContain('opacity-40');
	});

	it('invokes onclick when clicked', async () => {
		const onclick = vi.fn();

		const { container } = render(LimitOrderTokenPill, {
			props: { symbol: 'ICP', onclick }
		});

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(onclick).toHaveBeenCalledOnce();
	});

	it('renders the brand color when empty and enabled', () => {
		const { container } = render(LimitOrderTokenPill, {
			props: { onclick: () => {} }
		});

		expect(container.querySelector('button')?.className).toContain('text-brand-primary');
	});
});
