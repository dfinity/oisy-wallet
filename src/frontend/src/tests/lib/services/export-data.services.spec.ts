import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { loadNextIcTransactionsByOldest } from '$icp/services/ic-transactions.services';
import { loadNextSolTransactionsByOldest } from '$sol/services/sol-transactions.services';
import { Currency } from '$lib/enums/currency';
import { exportTokensCsv, exportTransactionsCsv } from '$lib/services/export-data.services';
import { toastsShow } from '$lib/stores/toasts.store';
import { consoleError } from '$lib/utils/console.utils';
import { downloadCsv } from '$lib/utils/csv.utils';
import {
	buildTokenRows,
	buildTransactionRows,
	sortTokenRows,
	sortTransactionRows,
	type TokenCsvRow,
	type TransactionCsvRow
} from '$lib/utils/export-data.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$icp/services/ic-transactions.services', () => ({
	loadNextIcTransactionsByOldest: vi.fn()
}));

vi.mock('$sol/services/sol-transactions.services', () => ({
	loadNextSolTransactionsByOldest: vi.fn()
}));

vi.mock('$lib/stores/toasts.store', () => ({
	toastsShow: vi.fn()
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

vi.mock(import('$lib/utils/csv.utils'), async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...actual,
		downloadCsv: vi.fn()
	};
});

vi.mock(import('$lib/utils/export-data.utils'), async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...actual,
		buildTokenRows: vi.fn(),
		sortTokenRows: vi.fn(),
		buildTransactionRows: vi.fn(),
		sortTransactionRows: vi.fn()
	};
});

const tokenRow: TokenCsvRow = {
	symbol: 'ICP',
	name: 'Internet Computer',
	network: 'Internet Computer',
	standard: 'icp',
	address_or_ledger_id: '',
	decimals: 8,
	balance: '1.0',
	balance_raw: '100000000',
	usd_price: 1,
	usd_value: 1,
	currency: 'USD',
	price: 1,
	value: 1
};

const transactionRow: TransactionCsvRow = {
	timestamp_iso: '2026-05-28T10:00:00.000Z',
	timestamp_local: '2026-05-28 10:00:00',
	timestamp_utc: '2026-05-28 10:00:00',
	network: 'Internet Computer',
	token_symbol: 'ICP',
	token_address_or_ledger_id: '',
	type: 'send',
	type_display: 'Send',
	type_raw: 'send',
	direction: 'out',
	status: 'executed',
	from: 'sender',
	to: 'recipient',
	counterparty: 'recipient',
	amount: '1.0',
	amount_raw: 100_000_000n,
	fee: '0.0001',
	fee_raw: 10_000n,
	fee_token: 'ICP',
	credit: '',
	credit_raw: undefined,
	debit: '-1.0001',
	debit_raw: -100_010_000n,
	fee_token_debit: '',
	fee_token_debit_raw: undefined,
	effective_token: '-1.0001',
	effective_fee_token: '',
	tx_id: 'tx-id',
	explorer_url: 'https://dashboard.internetcomputer.org/transaction/tx-id',
	exported_at: '2026-05-28T10:00:00.000Z'
};

const defaultTransactionParams = (): Parameters<typeof exportTransactionsCsv>[0] => ({
	identity: mockIdentity,
	tokens: [],
	buildTransactions: vi.fn(() => []),
	userAddresses: {},
	nativeSymbolByNetworkId: () => undefined,
	contacts: []
});

describe('export-data.services', () => {
	const mockLoadNextIcTransactionsByOldest = vi.mocked(loadNextIcTransactionsByOldest);
	const mockLoadNextSolTransactionsByOldest = vi.mocked(loadNextSolTransactionsByOldest);
	const mockBuildTokenRows = vi.mocked(buildTokenRows);
	const mockSortTokenRows = vi.mocked(sortTokenRows);
	const mockBuildTransactionRows = vi.mocked(buildTransactionRows);
	const mockSortTransactionRows = vi.mocked(sortTransactionRows);
	const mockDownloadCsv = vi.mocked(downloadCsv);
	const mockToastsShow = vi.mocked(toastsShow);
	const mockConsoleError = vi.mocked(consoleError);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-05-28T10:00:00.000Z'));
		vi.clearAllMocks();

		mockBuildTokenRows.mockReturnValue([tokenRow]);
		mockSortTokenRows.mockImplementation((rows) => rows);
		mockBuildTransactionRows.mockReturnValue([transactionRow]);
		mockSortTransactionRows.mockImplementation((rows) => rows);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('exportTokensCsv', () => {
		it('blocks non-USD exports while the exchange rate is unavailable', () => {
			const result = exportTokensCsv({
				tokens: [],
				currency: Currency.EUR,
				exchangeRateToUsd: null
			});

			expect(result).toBe(false);
			expect(mockBuildTokenRows).not.toHaveBeenCalled();
			expect(mockDownloadCsv).not.toHaveBeenCalled();
			expect(mockToastsShow).toHaveBeenCalledExactlyOnceWith({
				text: en.settings.error.export_exchange_rate_unavailable,
				level: 'error',
				duration: 4000
			});
		});

		it('downloads the requested token CSV variant and shows a success toast', () => {
			const result = exportTokensCsv({
				tokens: [],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				variant: 'basic'
			});

			expect(result).toBe(true);
			expect(mockDownloadCsv).toHaveBeenCalledExactlyOnceWith({
				filename: 'oisy-tokens-basic-2026-05-28T10-00-00-000Z.csv',
				csv: 'Network,Symbol,Name,Balance,Currency,Value\r\nInternet Computer,ICP,Internet Computer,1.0,USD,1'
			});
			expect(mockToastsShow).toHaveBeenCalledExactlyOnceWith({
				text: en.settings.text.export_tokens_success,
				level: 'success',
				duration: 2000
			});
		});
	});

	describe('exportTransactionsCsv', () => {
		it('does nothing when the identity is missing', async () => {
			const buildTransactions = vi.fn(() => []);

			const result = await exportTransactionsCsv({
				...defaultTransactionParams(),
				identity: null,
				buildTransactions
			});

			expect(result).toBe(false);
			expect(mockLoadNextIcTransactionsByOldest).not.toHaveBeenCalled();
			expect(mockLoadNextSolTransactionsByOldest).not.toHaveBeenCalled();
			expect(buildTransactions).not.toHaveBeenCalled();
			expect(mockDownloadCsv).not.toHaveBeenCalled();
			expect(mockToastsShow).not.toHaveBeenCalled();
		});

		it('keeps exporting after one paginated token loader fails', async () => {
			let icLoaderCalls = 0;
			const buildTransactions = vi.fn(() => []);

			mockLoadNextIcTransactionsByOldest.mockImplementation(async ({ signalEnd }) => {
				icLoaderCalls += 1;

				if (icLoaderCalls === 2) {
					signalEnd();
				}

				return { success: true };
			});
			mockLoadNextSolTransactionsByOldest.mockRejectedValue(new Error('sol loader failed'));

			const result = await exportTransactionsCsv({
				...defaultTransactionParams(),
				tokens: [ICP_TOKEN, SOLANA_TOKEN],
				buildTransactions,
				variant: 'basic'
			});

			expect(result).toBe(true);
			expect(mockLoadNextIcTransactionsByOldest).toHaveBeenCalledTimes(2);
			expect(mockLoadNextSolTransactionsByOldest).toHaveBeenCalledOnce();
			expect(buildTransactions).toHaveBeenCalledOnce();
			expect(mockBuildTransactionRows).toHaveBeenCalledOnce();
			expect(mockDownloadCsv).toHaveBeenCalledExactlyOnceWith({
				filename: 'oisy-transactions-basic-2026-05-28T10-00-00-000Z.csv',
				csv: 'Timestamp,Network,Token,Type,Amount,Counterparty,Fee,Fee Token,Credit,Debit,Fee Token Debit,Transaction ID\r\n2026-05-28 10:00:00,Internet Computer,ICP,Send,1.0,recipient,0.0001,ICP,,-1.0001,,tx-id'
			});
			expect(mockToastsShow).toHaveBeenCalledExactlyOnceWith({
				text: en.settings.text.export_transactions_success,
				level: 'success',
				duration: 2000
			});
		});

		it('shows an error toast when building the export throws', async () => {
			const error = new Error('row build failed');
			mockBuildTransactionRows.mockImplementation(() => {
				throw error;
			});

			const result = await exportTransactionsCsv(defaultTransactionParams());

			expect(result).toBe(false);
			expect(mockConsoleError).toHaveBeenCalledExactlyOnceWith(error);
			expect(mockDownloadCsv).not.toHaveBeenCalled();
			expect(mockToastsShow).toHaveBeenCalledExactlyOnceWith({
				text: en.settings.error.export_failed,
				level: 'error',
				duration: 4000
			});
		});
	});
});
