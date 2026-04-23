import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
import type * as AppConstants from '$lib/constants/app.constants';
import {
	LOGIN_BUTTON,
	LOGIN_BUTTON_APPLE,
	LOGIN_BUTTON_GOOGLE,
	LOGIN_BUTTON_MICROSOFT
} from '$lib/constants/test-ids.constants';
import * as auth from '$lib/services/auth.services';
import { modalStore } from '$lib/stores/modal.store';
import { InternetIdentityDomain, type OpenIdProvider } from '$lib/types/auth';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Force the non-local path: in mainnet builds `INTERNET_IDENTITY_CANISTER_ID`
// is `undefined`, which enables the Google / Apple / Microsoft (One-Click
// OpenID) buttons via `@icp-sdk/auth` v6. The Vitest test env defaults to
// `DFX_NETWORK=local` where that canister id IS defined, so we override it
// here to exercise the production code path.
vi.mock('$lib/constants/app.constants', async (importOriginal) => {
	const actual = await importOriginal<typeof AppConstants>();

	return {
		...actual,
		INTERNET_IDENTITY_CANISTER_ID: undefined
	};
});

describe('ButtonAuthenticateWithHelp — One-Click OpenID sign-in', () => {
	const openIdCases: Array<{ provider: OpenIdProvider; testId: string }> = [
		{ provider: 'google', testId: LOGIN_BUTTON_GOOGLE },
		{ provider: 'apple', testId: LOGIN_BUTTON_APPLE },
		{ provider: 'microsoft', testId: LOGIN_BUTTON_MICROSOFT }
	];

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
	});

	it('should still render the Internet Identity button', () => {
		const { container } = render(ButtonAuthenticateWithHelp);

		expect(
			container.querySelector<HTMLButtonElement>(`button[data-tid="${LOGIN_BUTTON}"]`)
		).toBeInTheDocument();
	});

	it('should render all three OpenID provider buttons', () => {
		const { container } = render(ButtonAuthenticateWithHelp);

		openIdCases.forEach(({ testId }) => {
			expect(
				container.querySelector<HTMLButtonElement>(`button[data-tid="${testId}"]`)
			).toBeInTheDocument();
		});
	});

	it.each(openIdCases)(
		'should call signIn with openIdProvider "$provider" when that button is clicked',
		async ({ provider, testId }) => {
			const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });

			const { container } = render(ButtonAuthenticateWithHelp);

			container.querySelector<HTMLButtonElement>(`button[data-tid="${testId}"]`)?.click();

			await waitFor(() => {
				expect(authSpy).toHaveBeenCalledExactlyOnceWith({
					domain: InternetIdentityDomain.VERSION_2_0,
					asPopup: false,
					openIdProvider: provider
				});
			});
		}
	);

	it.each(openIdCases)(
		'should forward asPopup alongside openIdProvider "$provider"',
		async ({ provider, testId }) => {
			const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });

			const { container } = render(ButtonAuthenticateWithHelp, { props: { asPopup: true } });

			container.querySelector<HTMLButtonElement>(`button[data-tid="${testId}"]`)?.click();

			await waitFor(() => {
				expect(authSpy).toHaveBeenCalledExactlyOnceWith({
					domain: InternetIdentityDomain.VERSION_2_0,
					asPopup: true,
					openIdProvider: provider
				});
			});
		}
	);

	it('should not pass openIdProvider when the primary Internet Identity button is clicked', async () => {
		const authSpy = vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'cancelled' });

		const { container } = render(ButtonAuthenticateWithHelp);

		container.querySelector<HTMLButtonElement>(`button[data-tid="${LOGIN_BUTTON}"]`)?.click();

		await waitFor(() => {
			expect(authSpy).toHaveBeenCalledExactlyOnceWith({
				domain: InternetIdentityDomain.VERSION_2_0,
				asPopup: false
			});
		});
	});

	it('should open the auth help modal when an OpenID sign-in fails', async () => {
		vi.spyOn(auth, 'signIn').mockResolvedValue({ success: 'error' });

		const { container } = render(ButtonAuthenticateWithHelp);

		container
			.querySelector<HTMLButtonElement>(`button[data-tid="${LOGIN_BUTTON_GOOGLE}"]`)
			?.click();

		await waitFor(() => {
			expect(get(modalStore)?.type).toBe('auth-help');
		});
	});
});
