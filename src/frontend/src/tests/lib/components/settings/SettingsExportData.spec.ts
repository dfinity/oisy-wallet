import SettingsExportData from '$lib/components/settings/SettingsExportData.svelte';
import * as exportDataServices from '$lib/services/export-data.services';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('SettingsExportData', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders the section title and both buttons', () => {
		const { getByText, getAllByRole } = render(SettingsExportData);

		expect(getByText(en.settings.text.export_data)).toBeInTheDocument();

		const buttons = getAllByRole('button') as HTMLButtonElement[];
		const labels = buttons.map((b) => b.textContent?.trim());

		expect(labels).toContain(en.settings.text.export_tokens);
		expect(labels).toContain(en.settings.text.export_transactions);
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
