import { replaceState } from '$app/navigation';
import { i18n } from '$lib/stores/i18n.store';
import CallbackPage from '$routes/(public)/signer-callback/+page@.svelte';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$app/navigation', () => ({
	replaceState: vi.fn((url: string) => window.history.replaceState(null, '', url))
}));

describe('HTTPS mobile authentication callback', () => {
	afterEach(() => window.history.replaceState(null, '', '/'));

	it.each([
		'#message=%7B%22signature%22%3A%22A%2BB%2FC%3D%22%7D&state=test-only',
		'#callback=https://other.example&state=test-only',
		'#message=malformed',
		''
	])('discards the response without exposing an app-return link: %s', async (hash) => {
		window.history.replaceState(null, '', `/signer-callback?returnTo=oisy://auth-callback${hash}`);
		const { container, getByText } = render(CallbackPage);

		await waitFor(() => expect(window.location.hash).toBe(''));

		expect(window.location.search).toBe('');
		expect(window.location.pathname).toBe('/signer-callback');
		expect(replaceState).toHaveBeenCalledWith('/signer-callback', {});
		expect(container.querySelector('a, button, form, iframe')).toBeNull();
		expect(container.textContent).not.toContain('test-only');
		expect(getByText(get(i18n).auth.error.missing_mobile_callback)).toBeInTheDocument();
	});

	it('discards a later response delivered to the same page', async () => {
		window.history.replaceState(null, '', '/signer-callback');
		const { container } = render(CallbackPage);
		window.history.replaceState(null, '', '/signer-callback#message=synthetic-response');
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		await waitFor(() => expect(window.location.hash).toBe(''));

		expect(container.querySelector('a, button, form')).toBeNull();
		expect(container.textContent).not.toContain('synthetic-response');
	});
});
