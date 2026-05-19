import SettingsExportData from '$lib/components/settings/SettingsExportData.svelte';
import * as exportDataServices from '$lib/services/export-data.services';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('SettingsExportData', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders the section title and both download buttons', () => {
		const { getByText, getByRole } = render(SettingsExportData);

		expect(getByText(en.settings.text.export_data)).toBeInTheDocument();
		// Both buttons show "Download >" as visible text and are differentiated by aria-label.
		expect(getByRole('button', { name: en.settings.text.export_tokens })).toBeInTheDocument();
		expect(getByRole('button', { name: en.settings.text.export_transactions })).toBeInTheDocument();
	});

	it('calls exportTokensCsv when the tokens button is clicked', async () => {
		const spy = vi.spyOn(exportDataServices, 'exportTokensCsv').mockReturnValue(true);

		const { getByRole } = render(SettingsExportData);

		await fireEvent.click(getByRole('button', { name: en.settings.text.export_tokens }));

		expect(spy).toHaveBeenCalledOnce();
	});

	it('calls exportTransactionsCsv when the transactions button is clicked', async () => {
		const spy = vi.spyOn(exportDataServices, 'exportTransactionsCsv').mockResolvedValue(true);

		const { getByRole } = render(SettingsExportData);

		await fireEvent.click(getByRole('button', { name: en.settings.text.export_transactions }));

		expect(spy).toHaveBeenCalledOnce();
	});
});
