import InfrastructureErrorPage from '$lib/components/auth/InfrastructureErrorPage.svelte';
import { PLAUSIBLE_EVENT_SUBCONTEXT_INFRASTRUCTURE } from '$lib/enums/plausible';
import * as authServices from '$lib/services/auth.services';
import { infrastructureError } from '$lib/stores/infrastructure-error.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { HttpFetchErrorCode, TransportError } from '@dfinity/agent';
import { fireEvent, render } from '@testing-library/svelte';

describe('InfrastructureErrorPage', () => {
	const networkError = () =>
		TransportError.fromCode(new HttpFetchErrorCode(new TypeError('Load failed')));

	beforeEach(() => {
		vi.clearAllMocks();

		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_INFRASTRUCTURE.USER_PROFILE,
			err: networkError()
		});
	});

	afterEach(() => {
		infrastructureError.reset();
	});

	it('should explain the situation without asserting a cause', () => {
		const { getByText } = render(InfrastructureErrorPage);

		expect(getByText(en.init.unavailable.title)).toBeInTheDocument();

		// The frontend cannot tell an IC outage from the user's own connectivity, so the copy must
		// stay symptom-level. This guards the wording against a future "our servers are down" edit.
		expect(en.init.unavailable.description).toMatch(/may be your internet connection/i);
	});

	it('should offer both a reload and a log out', () => {
		const { getByTestId } = render(InfrastructureErrorPage);

		expect(getByTestId('infrastructure-error-reload')).toBeInTheDocument();
		expect(getByTestId('infrastructure-error-logout')).toBeInTheDocument();
	});

	it('should reload the page on the primary action', async () => {
		const reload = vi.fn();

		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...window.location, reload }
		});

		const { getByTestId } = render(InfrastructureErrorPage);

		await fireEvent.click(getByTestId('infrastructure-error-reload'));

		expect(reload).toHaveBeenCalledOnce();
	});

	it('should sign out on the secondary action', async () => {
		const signOutSpy = vi.spyOn(authServices, 'signOut').mockResolvedValue(undefined);

		const { getByTestId } = render(InfrastructureErrorPage);

		await fireEvent.click(getByTestId('infrastructure-error-logout'));

		expect(signOutSpy).toHaveBeenCalledExactlyOnceWith({
			resetUrl: true,
			source: 'infrastructure-error-page'
		});
	});

	it('should name the failing operation in the details', () => {
		const { getByText } = render(InfrastructureErrorPage);

		const expected = replacePlaceholders(en.init.unavailable.operation, {
			$operation: PLAUSIBLE_EVENT_SUBCONTEXT_INFRASTRUCTURE.USER_PROFILE
		});

		expect(getByText(expected)).toBeInTheDocument();
	});

	// Developer text belongs behind a disclosure, not in the user's face — that is the toast
	// behaviour this page replaces.
	it('should keep the technical details collapsed by default', () => {
		const { getByTestId } = render(InfrastructureErrorPage);

		expect(getByTestId('collapsible-content')).toHaveAttribute(
			'style',
			expect.stringContaining('max-height: 0px')
		);
	});

	it('should reveal the sanitised error detail when expanded', async () => {
		const { getByTestId, getByText } = render(InfrastructureErrorPage);

		await fireEvent.click(getByTestId('collapsible-header'));

		expect(getByText(/Failed to fetch HTTP request/)).toBeInTheDocument();
		expect(getByTestId('collapsible-content')).not.toHaveAttribute(
			'style',
			expect.stringContaining('max-height: 0px')
		);
	});

	it('should render without a detail when the store carries none', () => {
		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_INFRASTRUCTURE.REWARDS,
			err: undefined
		});

		const { getByText } = render(InfrastructureErrorPage);

		expect(getByText(en.init.unavailable.title)).toBeInTheDocument();
	});
});
