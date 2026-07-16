import SettingsPreferences from '$lib/components/settings/SettingsPreferences.svelte';
import { CURRENCY_SWITCHER_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SettingsPreferences', () => {
	it('renders the Preferences card title and the language and currency row labels', () => {
		const { getByText } = render(SettingsPreferences);

		expect(getByText(en.settings.text.preferences)).toBeInTheDocument();
		expect(getByText(en.core.text.language)).toBeInTheDocument();
		expect(getByText(en.core.text.currency)).toBeInTheDocument();
	});

	it('renders the language and currency dropdowns', () => {
		const { container, getByTestId } = render(SettingsPreferences);

		expect(container.querySelector('.lang-selector')).toBeInTheDocument();
		expect(getByTestId(CURRENCY_SWITCHER_BUTTON)).toBeInTheDocument();
	});
});
