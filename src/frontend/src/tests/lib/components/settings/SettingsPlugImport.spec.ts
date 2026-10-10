import { goto } from '$app/navigation';
import SettingsPlugImport from '$lib/components/settings/SettingsPlugImport.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { PLUG_IMPORT_SETTINGS_LINK } from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent } from '@testing-library/dom';
import { render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('SettingsPlugImport', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the entry and its description', () => {
		const { getByText } = render(SettingsPlugImport);

		expect(getByText(en.plug_import.text.settings_entry_description)).toBeInTheDocument();
	});

	it('navigates to the Plug import page when opened', async () => {
		const { getByTestId } = render(SettingsPlugImport);

		await fireEvent.click(getByTestId(PLUG_IMPORT_SETTINGS_LINK));

		expect(goto).toHaveBeenCalledWith(AppPath.PlugImport);
	});
});
