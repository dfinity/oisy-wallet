import { loadNextIcTransactionsByOldest } from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { Currency } from '$lib/enums/currency';
import { i18n } from '$lib/stores/i18n.store';
import { toastsShow } from '$lib/stores/toasts.store';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import { consoleError } from '$lib/utils/console.utils';
import { downloadCsv, toCsv } from '$lib/utils/csv.utils';
import {
	BASIC_TOKEN_CSV_COLUMNS,
	BASIC_TRANSACTION_CSV_COLUMNS,
	TOKEN_CSV_COLUMNS,
	TRANSACTION_CSV_COLUMNS,
	buildTokenRows,
	buildTransactionRows,
	sortBasicTokenRows,
	sortBasicTransactionRows,
	type UserAddresses
} from '$lib/utils/export-data.utils';
import { isNetworkIdICP, isNetworkIdSolana } from '$lib/utils/network.utils';
import { loadNextSolTransactionsByOldest } from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { get } from 'svelte/store';

const csvFilename = ({ base, exportedAt }: { base: string; exportedAt: Date }): string => {
	const stamp = exportedAt.toISOString().replace(/[:.]/g, '-').replace(/-+$/, '');
	return `${base}-${stamp}.csv`;
};

export type TokenCsvVariant = 'basic' | 'extended';

const TOKEN_CSV_COLUMNS_BY_VARIANT = {
	basic: BASIC_TOKEN_CSV_COLUMNS,
	extended: TOKEN_CSV_COLUMNS
} as const;

const TOKEN_CSV_FILENAME_BASE_BY_VARIANT = {
	basic: 'oisy-tokens-basic',
	extended: 'oisy-tokens'
} as const;

export const exportTokensCsv = ({
	tokens,
	currency,
	exchangeRateToUsd,
	variant = 'extended'
}: {
	tokens: TokenUi[];
	currency: Currency;
	exchangeRateToUsd: number | null;
	variant?: TokenCsvVariant;
}): boolean => {
	const $i18n = get(i18n);

	if (currency !== Currency.USD && isNullish(exchangeRateToUsd)) {
		toastsShow({
			text: $i18n.settings.error.export_exchange_rate_unavailable,
			level: 'error',
			duration: 4000
		});
		return false;
	}

	const exportedAt = new Date();
	const unsortedRows = buildTokenRows({ tokens, currency, exchangeRateToUsd });
	// The Basic export is meant to be skimmed by humans — sort it by network → symbol → name
	// so similar tokens cluster. The Extended export keeps store order so power users can
	// correlate it with the wallet UI.
	const rows = variant === 'basic' ? sortBasicTokenRows(unsortedRows) : unsortedRows;
	const csv = toCsv({ columns: TOKEN_CSV_COLUMNS_BY_VARIANT[variant], rows });

	downloadCsv({
		filename: csvFilename({ base: TOKEN_CSV_FILENAME_BASE_BY_VARIANT[variant], exportedAt }),
		csv
	});

	toastsShow({
		text: $i18n.settings.text.export_tokens_success,
		level: 'success',
		duration: 2000
	});

	return true;
};

// Recursively walks the ICP / SOL pagination cursors until each per-token loader signals end.
// BTC and EVM transactions are populated by background workers and don't paginate from the client,
// so we rely on whatever those stores already hold.
const loadAllTransactionsHistory = async ({
	identity,
	tokens
}: {
	identity: Identity;
	tokens: Token[];
}): Promise<void> => {
	const disableLoader: Record<string, boolean> = {};

	const loadOne = async (token: Token): Promise<void> => {
		const {
			id: tokenId,
			network: { id: networkId }
		} = token;
		const key = String(tokenId);

		if (disableLoader[key]) {
			return;
		}

		if (isNetworkIdICP(networkId)) {
			const current = (get(icTransactionsStore)?.[tokenId] ?? []).map(({ data }) => data);
			const { success } = await loadNextIcTransactionsByOldest({
				minTimestamp: 0,
				transactions: current,
				owner: identity.getPrincipal(),
				identity,
				maxResults: WALLET_PAGINATION,
				token,
				signalEnd: () => {
					disableLoader[key] = true;
				}
			});

			if (success) {
				await loadOne(token);
			}
			return;
		}

		if (isNetworkIdSolana(networkId)) {
			const current = (get(solTransactionsStore)?.[tokenId] ?? []).map(({ data }) => data);
			const { success } = await loadNextSolTransactionsByOldest({
				identity,
				minTimestamp: 0,
				transactions: current,
				token,
				signalEnd: () => {
					disableLoader[key] = true;
				}
			});

			if (success) {
				await loadOne(token);
			}
		}
	};

	await Promise.allSettled(tokens.map(loadOne));
};

export type TransactionCsvVariant = 'basic' | 'extended';

const TRANSACTION_CSV_COLUMNS_BY_VARIANT = {
	basic: BASIC_TRANSACTION_CSV_COLUMNS,
	extended: TRANSACTION_CSV_COLUMNS
} as const;

const TRANSACTION_CSV_FILENAME_BASE_BY_VARIANT = {
	basic: 'oisy-transactions-basic',
	extended: 'oisy-transactions'
} as const;

export const exportTransactionsCsv = async ({
	identity,
	tokens,
	buildTransactions,
	userAddresses,
	nativeSymbolByNetworkId,
	contacts,
	variant = 'extended'
}: {
	identity: Nullish<Identity>;
	tokens: Token[];
	buildTransactions: () => AllTransactionUiWithCmp[];
	userAddresses: UserAddresses;
	nativeSymbolByNetworkId: Parameters<typeof buildTransactionRows>[0]['nativeSymbolByNetworkId'];
	contacts: ContactUi[];
	variant?: TransactionCsvVariant;
}): Promise<boolean> => {
	const $i18n = get(i18n);

	if (isNullish(identity)) {
		return false;
	}

	try {
		await loadAllTransactionsHistory({ identity, tokens });

		const transactions = buildTransactions();
		const exportedAt = new Date();
		const unsortedRows = buildTransactionRows({
			transactions,
			userAddresses,
			nativeSymbolByNetworkId,
			contacts,
			exportedAt
		});
		// The Basic export is meant to be skimmed like an activity feed — sort newest first.
		// The Extended export keeps store order so power users can correlate with the wallet UI.
		const rows = variant === 'basic' ? sortBasicTransactionRows(unsortedRows) : unsortedRows;
		const csv = toCsv({ columns: TRANSACTION_CSV_COLUMNS_BY_VARIANT[variant], rows });

		downloadCsv({
			filename: csvFilename({
				base: TRANSACTION_CSV_FILENAME_BASE_BY_VARIANT[variant],
				exportedAt
			}),
			csv
		});

		toastsShow({
			text: $i18n.settings.text.export_transactions_success,
			level: 'success',
			duration: 2000
		});

		return true;
	} catch (error: unknown) {
		consoleError(error);
		toastsShow({
			text: $i18n.settings.error.export_failed,
			level: 'error',
			duration: 4000
		});
		return false;
	}
};
