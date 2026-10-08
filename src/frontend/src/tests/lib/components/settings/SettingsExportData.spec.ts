import SettingsExportData from '$lib/components/settings/SettingsExportData.svelte';
import * as exportDataServices from '$lib/services/export-data.services';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

const basicTokensLabel = `${en.settings.text.export_tokens} (${en.settings.text.export_basic})`;
const extendedTokensLabel = `${en.settings.text.export_tokens} (${en.settings.text.export_extended})`;
const basicTransactionsLabel = `${en.settings.text.export_transactions} (${en.settings.text.export_basic})`;
const extendedTransactionsLabel = `${en.settings.text.export_transactions} (${en.settings.text.export_extended})`;

describe('SettingsExportData', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders both subsection labels and all four download buttons', () => {
		const { getByText, getByRole } = render(SettingsExportData);

		expect(getByText(en.settings.text.export_data)).toBeInTheDocument();
		expect(getByText(en.settings.text.export_basic)).toBeInTheDocument();
		expect(getByText(en.settings.text.export_extended)).toBeInTheDocument();
		// Each export is differentiated by aria-label since all four show "Download >" visually.
		expect(getByRole('button', { name: basicTokensLabel })).toBeInTheDocument();
		expect(getByRole('button', { name: extendedTokensLabel })).toBeInTheDocument();
		expect(getByRole('button', { name: basicTransactionsLabel })).toBeInTheDocument();
		expect(getByRole('button', { name: extendedTransactionsLabel })).toBeInTheDocument();
	});

	it('calls exportTokensCsv with variant=basic when the basic tokens button is clicked', async () => {
		const spy = vi.spyOn(exportDataServices, 'exportTokensCsv').mockReturnValue(true);

		const { getByRole } = render(SettingsExportData);

		await fireEvent.click(getByRole('button', { name: basicTokensLabel }));

		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0][0]).toMatchObject({ variant: 'basic' });
	});

	it('calls exportTokensCsv with variant=extended when the extended tokens button is clicked', async () => {
		const spy = vi.spyOn(exportDataServices, 'exportTokensCsv').mockReturnValue(true);

		const { getByRole } = render(SettingsExportData);

		await fireEvent.click(getByRole('button', { name: extendedTokensLabel }));

		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0][0]).toMatchObject({ variant: 'extended' });
	});

	it('calls exportTransactionsCsv with variant=basic when the basic transactions button is clicked', async () => {
		const spy = vi.spyOn(exportDataServices, 'exportTransactionsCsv').mockResolvedValue(true);

		const { getByRole } = render(SettingsExportData);

		await fireEvent.click(getByRole('button', { name: basicTransactionsLabel }));

		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0][0]).toMatchObject({ variant: 'basic' });
	});

	it('calls exportTransactionsCsv with variant=extended when the extended transactions button is clicked', async () => {
		const spy = vi.spyOn(exportDataServices, 'exportTransactionsCsv').mockResolvedValue(true);

		const { getByRole } = render(SettingsExportData);

		await fireEvent.click(getByRole('button', { name: extendedTransactionsLabel }));

		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0][0]).toMatchObject({ variant: 'extended' });
	});
});
