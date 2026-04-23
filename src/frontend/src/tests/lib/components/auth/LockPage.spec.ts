import LockPage from '$lib/components/auth/LockPage.svelte';
import type * as AppConstants from '$lib/constants/app.constants';
import {
	LOGIN_BUTTON,
	LOGIN_BUTTON_APPLE,
	LOGIN_BUTTON_GOOGLE,
	LOGIN_BUTTON_MICROSOFT
} from '$lib/constants/test-ids.constants';
import * as authServices from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { authLocked } from '$lib/stores/locked.store';
import { InternetIdentityDomain, type OpenIdProvider } from '$lib/types/auth';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Mutable override for `INTERNET_IDENTITY_CANISTER_ID` so individual tests can
// exercise both code paths of the component:
// - defined (local dev): One-Click OpenID buttons are hidden because the local
//   II replica does not handle the `?openid=...` query param.
// - undefined (mainnet): One-Click OpenID buttons are rendered.
const hoisted = vi.hoisted(() => ({
	internetIdentityCanisterId: undefined as string | undefined
}));

vi.mock('$lib/constants/app.constants', async (importOriginal) => {
	const actual = await importOriginal<typeof AppConstants>();

	return {
		...actual,
		get INTERNET_IDENTITY_CANISTER_ID() {
			return hoisted.internetIdentityCanisterId;
		}
	};
});

describe('LockPage', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(authLocked, 'unlock');
		hoisted.internetIdentityCanisterId = undefined;

		// Mock the imports
		vi.mock('$lib/services/auth.services', () => ({
			signIn: vi.fn(),
			signOut: vi.fn()
		}));
	});

	it('should render with correct structure', () => {
		const { getByText, getByRole, container } = render(LockPage);

		// Check logo is present - using the actual aria-label from your component
		expect(getByRole('link', { name: 'Go to the OISY Wallet home page' })).toBeInTheDocument();

		// Check titles
		expect(getByText(get(i18n).lock.text.title_part_1)).toBeInTheDocument();
		expect(getByText(get(i18n).lock.text.title_part_2)).toBeInTheDocument();

		// Check buttons
		expect(
			container.querySelector<HTMLButtonElement>(`button[data-tid="${LOGIN_BUTTON}"]`)
		).toBeInTheDocument();
		expect(getByText(get(i18n).lock.text.logout)).toBeInTheDocument();

		// Check footer text
		expect(getByText(get(i18n).lock.text.logout_clear_cash_message)).toBeInTheDocument();
		expect(getByText(get(i18n).lock.text.learn_more)).toBeInTheDocument();
	});

	it('should call signIn with domain param when the Internet Identity button is clicked', async () => {
		const signInMock = vi.spyOn(authServices, 'signIn').mockResolvedValue({ success: 'ok' });

		const { container } = render(LockPage);
		const signInButton = container.querySelector<HTMLButtonElement>(
			`button[data-tid="${LOGIN_BUTTON}"]`
		);

		expect(signInButton).toBeInTheDocument();

		await fireEvent.click(signInButton!);

		expect(signInMock).toHaveBeenCalledExactlyOnceWith({
			domain: InternetIdentityDomain.VERSION_2_0
		});
		expect(authLocked.unlock).toHaveBeenCalledWith({
			source: 'login from lock page'
		});
	});

	describe('with Internet Identity canister id defined (local dev)', () => {
		beforeEach(() => {
			hoisted.internetIdentityCanisterId = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
		});

		// In local dev the component must hide the One-Click OpenID buttons to
		// protect us from accidentally exposing them on a local II replica,
		// which doesn't handle the `?openid=...` query param.
		it.each([LOGIN_BUTTON_GOOGLE, LOGIN_BUTTON_APPLE, LOGIN_BUTTON_MICROSOFT])(
			'should not render the %s button in local dev',
			(testId) => {
				const { container } = render(LockPage);

				expect(
					container.querySelector<HTMLButtonElement>(`button[data-tid="${testId}"]`)
				).not.toBeInTheDocument();
			}
		);

		it('should still render the Internet Identity button', () => {
			const { container } = render(LockPage);

			expect(
				container.querySelector<HTMLButtonElement>(`button[data-tid="${LOGIN_BUTTON}"]`)
			).toBeInTheDocument();
		});
	});

	describe('with Internet Identity canister id undefined (mainnet / One-Click OpenID)', () => {
		const openIdCases: Array<{ provider: OpenIdProvider; testId: string }> = [
			{ provider: 'google', testId: LOGIN_BUTTON_GOOGLE },
			{ provider: 'apple', testId: LOGIN_BUTTON_APPLE },
			{ provider: 'microsoft', testId: LOGIN_BUTTON_MICROSOFT }
		];

		it('should render all three OpenID provider buttons', () => {
			const { container } = render(LockPage);

			openIdCases.forEach(({ testId }) => {
				expect(
					container.querySelector<HTMLButtonElement>(`button[data-tid="${testId}"]`)
				).toBeInTheDocument();
			});
		});

		it.each(openIdCases)(
			'should call signIn with openIdProvider "$provider" and unlock the lock store when the "$testId" button is clicked',
			async ({ provider, testId }) => {
				const signInMock = vi
					.spyOn(authServices, 'signIn')
					.mockResolvedValue({ success: 'ok' });

				const { container } = render(LockPage);

				container.querySelector<HTMLButtonElement>(`button[data-tid="${testId}"]`)?.click();

				await waitFor(() => {
					expect(signInMock).toHaveBeenCalledExactlyOnceWith({
						domain: InternetIdentityDomain.VERSION_2_0,
						openIdProvider: provider
					});
				});

				expect(authLocked.unlock).toHaveBeenCalledWith({
					source: 'login from lock page'
				});
			}
		);
	});
});
