import PillButton from '$lib/components/ui/PillButton.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

describe('PillButton', () => {
	const createTextSnippet = (text: string) =>
		createRawSnippet(() => ({
			render: () => `<span>${text}</span>`
		}));

	it('should render children content', () => {
		const { getByText } = render(PillButton, {
			props: { children: createTextSnippet('Crypto') }
		});

		expect(getByText('Crypto')).toBeInTheDocument();
	});

	it('should render as a button element', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test') }
		});

		const button = container.querySelector('button');

		expect(button).toBeInTheDocument();
	});

	it('should have pill shape classes', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test') }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('rounded-full')).toBeTruthy();
		expect(button?.classList.contains('border')).toBeTruthy();
		expect(button?.classList.contains('text-xs')).toBeTruthy();
		expect(button?.classList.contains('font-medium')).toBeTruthy();
	});

	it('should apply unselected styles by default', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test') }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('border-secondary')).toBeTruthy();
		expect(button?.classList.contains('text-secondary')).toBeTruthy();
		expect(button?.classList.contains('bg-brand-primary')).toBeFalsy();
	});

	it('should apply selected styles when selected is true', () => {
		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Test'), selected: true }
		});

		const button = container.querySelector('button');

		expect(button?.classList.contains('bg-brand-primary')).toBeTruthy();
		expect(button?.classList.contains('border-brand-primary')).toBeTruthy();
		expect(button?.classList.contains('text-primary-inverted')).toBeTruthy();
		expect(button?.classList.contains('border-secondary')).toBeFalsy();
		expect(button?.classList.contains('text-secondary')).toBeFalsy();
	});

	it('should call onclick handler when clicked', async () => {
		const onClick = vi.fn();

		const { container } = render(PillButton, {
			props: { children: createTextSnippet('Click me'), onClick }
		});

		const button = container.querySelector('button');

		expect(button).toBeDefined();

		assertNonNullish(button);

		await fireEvent.click(button);

		expect(onclick).toHaveBeenCalledOnce();
	});
});
