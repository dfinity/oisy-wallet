import { goto } from '$app/navigation';
import Settings from '$lib/components/settings/Settings.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import {
	CURRENCY_SWITCHER_BUTTON,
	SETTINGS_EXPORT_DATA_TOOLS_BUTTON
} from '$lib/constants/test-ids.constants';
import { authRemainingTimeStore } from '$lib/stores/auth.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockAuthSignedIn, mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	goto: vi.fn()
}));

describe('Settings', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockAuthStore();
		mockAuthSignedIn(true);
		authRemainingTimeStore.set(undefined);
		userProfileStore.set({ certified: true, profile: mockUserProfile });
	});

	it('renders language and currency preferences on the Settings page', () => {
		const { container, getByTestId, getByText } = render(Settings);

		expect(getByText(en.settings.text.preferences)).toBeInTheDocument();
		expect(getByText(en.core.text.language)).toBeInTheDocument();
		expect(container.querySelector('.lang-selector')).toBeInTheDocument();
		expect(getByText(en.core.text.currency)).toBeInTheDocument();
		expect(getByTestId(CURRENCY_SWITCHER_BUTTON)).toBeInTheDocument();
	});

	it('renders the Security card between General and Preferences', () => {
		const { getByText } = render(Settings);

		const general = getByText(en.settings.text.general);
		const security = getByText(en.settings.text.security);
		const preferences = getByText(en.settings.text.preferences);

		expect(
			general.compareDocumentPosition(security) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(
			security.compareDocumentPosition(preferences) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('renders the small transactions filter in the Security card', () => {
		const { getByText } = render(Settings);

		const security = getByText(en.settings.text.security);
		const preferences = getByText(en.settings.text.preferences);
		const filter = getByText(en.settings.text.hide_micro_transactions);

		expect(
			security.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(
			filter.compareDocumentPosition(preferences) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('points Export data to the Tools page', async () => {
		const { getByTestId, getByText, queryByText } = render(Settings);

		expect(getByText(en.settings.text.export_data)).toBeInTheDocument();
		expect(getByText(en.settings.text.export_data_moved)).toBeInTheDocument();
		expect(queryByText(en.settings.text.export_tokens)).toBeNull();
		expect(queryByText(en.settings.text.export_transactions)).toBeNull();

		const button = getByTestId(SETTINGS_EXPORT_DATA_TOOLS_BUTTON);

		expect(button).toHaveTextContent(en.settings.text.open_tools);

		await fireEvent.click(button);

		expect(goto).toHaveBeenCalledWith(AppPath.Tools);
	});
});
