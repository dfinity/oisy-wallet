import LandingClose from '$lib/components/auth/LandingClose.svelte';
import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('LandingClose', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('shows the tagline', () => {
		const { getByRole } = render(LandingClose);

		expect(
			getByRole('heading', { level: 2, name: get(i18n).auth.landing.close_title })
		).toBeInTheDocument();
	});

	it('signs in from its own button without reusing the hero test id', async () => {
		const signIn = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'ok' });
		const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		const { container } = render(LandingClose);

		expect(container.querySelector(`[data-tid="${LOGIN_BUTTON}"]`)).not.toBeInTheDocument();

		const button = container.querySelector<HTMLButtonElement>(
			`button[data-tid="${LOGIN_BUTTON}-closing"]`
		);

		expect(button).toBeInTheDocument();

		await fireEvent.click(button as HTMLButtonElement);

		expect(signIn).toHaveBeenCalledOnce();

		await waitFor(() =>
			expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 0, top: 0, behavior: 'instant' })
		);
	});

	it.each(['cancelled', 'error'] as const)(
		'preserves scroll when sign-in returns %s',
		async (success) => {
			const signIn = vi.spyOn(auth, 'signIn').mockResolvedValue({ success });
			const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
			const { getByTestId } = render(LandingClose);

			await fireEvent.click(getByTestId(`${LOGIN_BUTTON}-closing`));
			await tick();

			expect(signIn).toHaveBeenCalledOnce();
			expect(scrollTo).not.toHaveBeenCalled();
		}
	);
});
