import ButtonSignInInternetIdentity from '$lib/components/auth/ButtonSignInInternetIdentity.svelte';
import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ButtonSignInInternetIdentity', () => {
	const selector = `button[data-tid="${LOGIN_BUTTON}"]`;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the Internet Identity button with the localized label', () => {
		const { container } = render(ButtonSignInInternetIdentity, {
			props: { onclick: vi.fn() }
		});

		const button = container.querySelector<HTMLButtonElement>(selector);

		expect(button).toBeInTheDocument();
		expect(button?.textContent).toContain(get(i18n).auth.text.internet_identity);
	});

	it('should call onclick when the button is clicked', () => {
		const onclick = vi.fn();

		const { container } = render(ButtonSignInInternetIdentity, { props: { onclick } });

		const button = container.querySelector<HTMLButtonElement>(selector);

		button?.click();

		expect(onclick).toHaveBeenCalledOnce();
	});

	it('should render as a button of type="button" to avoid accidental form submissions', () => {
		const { container } = render(ButtonSignInInternetIdentity, {
			props: { onclick: vi.fn() }
		});

		expect(container.querySelector<HTMLButtonElement>(selector)?.type).toBe('button');
	});

	it('should cap the button width on md+ viewports when fullWidth is false (default)', () => {
		const { container } = render(ButtonSignInInternetIdentity, {
			props: { onclick: vi.fn() }
		});

		expect(container.querySelector(selector)?.classList.contains('md:w-[200px]')).toBe(true);
	});

	it('should not cap the width when fullWidth is true', () => {
		const { container } = render(ButtonSignInInternetIdentity, {
			props: { onclick: vi.fn(), fullWidth: true }
		});

		expect(container.querySelector(selector)?.classList.contains('md:w-[200px]')).toBe(false);
	});
});
