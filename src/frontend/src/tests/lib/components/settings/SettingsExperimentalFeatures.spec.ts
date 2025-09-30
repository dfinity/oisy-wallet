import SettingsExperimentalFeatures from '$lib/components/settings/SettingsExperimentalFeatures.svelte';
import { userProfileStore } from '$lib/stores/user-profile.store';
import en from '$tests/mocks/i18n.mock';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';
import { render } from '@testing-library/svelte';

describe('SettingsExperimentalFeatures', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders disabled AI assistant feature setting', () => {
		const { getByText, getByRole } = render(SettingsExperimentalFeatures);

		expect(getByText(en.settings.text.beta_features)).toBeInTheDocument();

		const checkbox = getByRole('checkbox') as HTMLInputElement;

		expect(checkbox.checked).toBeFalsy();
	});

	it('renders enabled AI assistant feature setting', () => {
		userProfileStore.set({ certified: true, profile: mockUserProfile });

		const { getByText, getByRole } = render(SettingsExperimentalFeatures);

		expect(getByText(en.settings.text.beta_features)).toBeInTheDocument();

		const checkbox = getByRole('checkbox') as HTMLInputElement;

		expect(checkbox.checked).toBeTruthy();
	});
});
