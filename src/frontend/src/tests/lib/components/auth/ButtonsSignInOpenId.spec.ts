import ButtonsSignInOpenId from '$lib/components/auth/ButtonsSignInOpenId.svelte';
import {
	LOGIN_BUTTON_APPLE,
	LOGIN_BUTTON_GOOGLE,
	LOGIN_BUTTON_MICROSOFT
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import type { OpenIdProvider } from '$lib/types/auth';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ButtonsSignInOpenId', () => {
	const cases: Array<{
		provider: OpenIdProvider;
		testId: string;
		ariaLabelKey:
			| 'sign_in_with_google'
			| 'sign_in_with_apple'
			| 'sign_in_with_microsoft';
	}> = [
		{ provider: 'google', testId: LOGIN_BUTTON_GOOGLE, ariaLabelKey: 'sign_in_with_google' },
		{ provider: 'apple', testId: LOGIN_BUTTON_APPLE, ariaLabelKey: 'sign_in_with_apple' },
		{
			provider: 'microsoft',
			testId: LOGIN_BUTTON_MICROSOFT,
			ariaLabelKey: 'sign_in_with_microsoft'
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render one button per supported OpenID provider', () => {
		const { container } = render(ButtonsSignInOpenId, {
			props: { onProviderSelected: vi.fn() }
		});

		expect(container.querySelectorAll('button')).toHaveLength(cases.length);
	});

	it.each(cases)(
		'should render the $provider button with the expected test id and aria-label',
		({ provider, testId, ariaLabelKey }) => {
			const { container } = render(ButtonsSignInOpenId, {
				props: { onProviderSelected: vi.fn() }
			});

			const button = container.querySelector<HTMLButtonElement>(
				`button[data-tid="${testId}"]`
			);

			expect(button).toBeInTheDocument();
			expect(button?.getAttribute('aria-label')).toBe(get(i18n).auth.alt[ariaLabelKey]);
			expect(button?.type).toBe('button');
			expect(provider).toBeDefined();
		}
	);

	it.each(cases)(
		'should invoke onProviderSelected with "$provider" when its button is clicked',
		async ({ provider, testId }) => {
			const onProviderSelected = vi.fn();

			const { container } = render(ButtonsSignInOpenId, { props: { onProviderSelected } });

			container.querySelector<HTMLButtonElement>(`button[data-tid="${testId}"]`)?.click();

			expect(onProviderSelected).toHaveBeenCalledExactlyOnceWith(provider);
		}
	);

	it('should not invoke onProviderSelected for unrelated buttons', () => {
		const onProviderSelected = vi.fn();

		render(ButtonsSignInOpenId, { props: { onProviderSelected } });

		expect(onProviderSelected).not.toHaveBeenCalled();
	});
});
