import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import type { Currency } from '$lib/enums/currency';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
import type { CsvColumn, CsvRow } from '$lib/utils/csv.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import Decimal from 'decimal.js';
import { formatUnits } from 'ethers/utils';

export interface TokenCsvRow extends CsvRow {
	symbol: string;
	name: string;
	network: string;
	standard: string;
	address_or_ledger_id: string;
	decimals: number;
	balance: string;
	balance_raw: string;
	usd_price: number | undefined;
	usd_value: number | undefined;
	currency: string;
	price: number | undefined;
	value: number | undefined;
}

// Extended tokens export. Network / Symbol / Name lead so the file groups by chain at a
// glance — same order as the Basic variant. Headers are title-cased for spreadsheet
// readability. Balance is the raw integer (in the token's smallest unit) so a single
// column can represent any precision without losing significant digits; pair it with the
// Decimals column to reconstruct the decimal value. The Basic variant keeps the decimal
// `balance` for human reading.
export const TOKEN_CSV_COLUMNS: CsvColumn<TokenCsvRow>[] = [
	{ key: 'network', header: 'Network' },
	{ key: 'symbol', header: 'Symbol' },
	{ key: 'name', header: 'Name' },
	{ key: 'standard', header: 'Standard' },
	{ key: 'address_or_ledger_id', header: 'Address / Ledger ID' },
	{ key: 'decimals', header: 'Decimals' },
	{ key: 'balance_raw', header: 'Balance' },
	{ key: 'usd_price', header: 'Price [USD]' },
	{ key: 'usd_value', header: 'Value [USD]' },
	{ key: 'currency', header: 'Currency' },
	{ key: 'price', header: 'Price' },
	{ key: 'value', header: 'Value' }
];

// Slim variant for the Basic tokens export — just the columns a non-technical user needs to
// answer "what tokens do I hold and what are they worth in my currency". Network comes first
// so the file groups naturally by chain when sorted, and headers are title-cased since this
// CSV is meant to be opened in a spreadsheet by a human. The Extended variant keeps the raw
// snake_case headers so power users have stable, programmer-friendly column names.
export const BASIC_TOKEN_CSV_COLUMNS: CsvColumn<TokenCsvRow>[] = [
	{ key: 'network', header: 'Network' },
	{ key: 'symbol', header: 'Symbol' },
	{ key: 'name', header: 'Name' },
	{ key: 'balance', header: 'Balance' },
	{ key: 'currency', header: 'Currency' },
	{ key: 'value', header: 'Value' }
];

// Sorts a tokens export lexicographically by network → symbol → name. Locale-aware so
// users on non-English locales still see a natural ordering. Returns a new array — the
// input is not mutated. Used for both Basic and Extended so the two CSVs line up row by
// row when opened side by side.
export const sortTokenRows = (rows: TokenCsvRow[]): TokenCsvRow[] =>
	[...rows].sort(
		(a, b) =>
			a.network.localeCompare(b.network) ||
			a.symbol.localeCompare(b.symbol) ||
			a.name.localeCompare(b.name)
	);

export interface TransactionCsvRow extends CsvRow {
	timestamp_iso: string;
	timestamp_local: string;
	timestamp_utc: string;
	network: string;
	token_symbol: string;
	token_address_or_ledger_id: string;
	type: string;
	type_display: string;
	type_raw: string;
	direction: string;
	status: string;
	from: string;
	to: string;
	counterparty: string;
	amount: string;
	amount_raw: bigint | undefined;
	fee: string;
	fee_raw: bigint | undefined;
	fee_token: string;
	credit: string;
	credit_raw: bigint | undefined;
	debit: string;
	debit_raw: bigint | undefined;
	fee_token_debit: string;
	fee_token_debit_raw: bigint | undefined;
	effective_token: string;
	effective_fee_token: string;
	tx_id: string;
	explorer_url: string;
	exported_at: string;
}

// Extended transactions export — like the Basic but with raw-integer accounting columns
// (mirrors Balance in the Extended tokens variant), the chain-native type alongside the
// normalized one, and the raw From / To addresses + Explorer URL for power users. Timestamp
// is in UTC ("Zulu time") so two users in different timezones can compare exports row by
// row.
export const TRANSACTION_CSV_COLUMNS: CsvColumn<TransactionCsvRow>[] = [
	{ key: 'timestamp_utc', header: 'Timestamp UTC' },
	{ key: 'network', header: 'Network' },
	{ key: 'token_symbol', header: 'Token' },
	{ key: 'token_address_or_ledger_id', header: 'Token Address' },
	{ key: 'type_display', header: 'Type' },
	{ key: 'type_raw', header: 'Native Type' },
	{ key: 'counterparty', header: 'Counterparty' },
	{ key: 'from', header: 'From' },
	{ key: 'to', header: 'To' },
	{ key: 'amount_raw', header: 'Amount' },
	{ key: 'fee_raw', header: 'Fee' },
	{ key: 'fee_token', header: 'Fee Token' },
	{ key: 'credit_raw', header: 'Credit' },
	{ key: 'debit_raw', header: 'Debit' },
	{ key: 'fee_token_debit_raw', header: 'Fee Token Debit' },
	{ key: 'tx_id', header: 'Transaction ID' },
	{ key: 'explorer_url', header: 'Explorer URL' }
];

// Slim variant for the Basic transactions export — 12 spreadsheet-friendly columns.
// Amount / Fee / Fee Token are descriptive (raw positive values for human reading); Credit
// / Debit / Fee Token Debit are signed accounting columns that sum to the user's actual
// balance change per token. Approves contribute only the fee to Debit since the allowance
// itself doesn't move the user's balance.
export const BASIC_TRANSACTION_CSV_COLUMNS: CsvColumn<TransactionCsvRow>[] = [
	{ key: 'timestamp_local', header: 'Timestamp' },
	{ key: 'network', header: 'Network' },
	{ key: 'token_symbol', header: 'Token' },
	{ key: 'type_display', header: 'Type' },
	{ key: 'amount', header: 'Amount' },
	{ key: 'counterparty', header: 'Counterparty' },
	{ key: 'fee', header: 'Fee' },
	{ key: 'fee_token', header: 'Fee Token' },
	{ key: 'credit', header: 'Credit' },
	{ key: 'debit', header: 'Debit' },
	{ key: 'fee_token_debit', header: 'Fee Token Debit' },
	{ key: 'tx_id', header: 'Transaction ID' }
];

// Direction rank used to break ties when two rows share both the timestamp and the token.
// 'in' rows are treated as "more recent" than 'out' rows so a self-send pair reads
// "arrival above departure" in a newest-first sort — the OUT and IN duplicate of an ICRC
// self-transfer share the same timestamp, and reading top-down (newest first) you walk
// backward in time, so the IN (which represents the asset coming back) should sit above
// the OUT (the earlier event of sending it out). Rows without a direction sink below both.
const directionRank = (direction: string): number =>
	direction === 'in' ? 2 : direction === 'out' ? 1 : 0;

// Sorts the transactions export by timestamp descending — newest first, the natural
// activity-feed order. Ties resolve by token symbol (alphabetical), then by direction
// ('in' before 'out', see directionRank). Rows without a parseable timestamp sink to the
// bottom rather than jumping to either end. Used for both Basic and Extended variants.
export const sortTransactionRows = (rows: TransactionCsvRow[]): TransactionCsvRow[] =>
	[...rows].sort((a, b) => {
		if (a.timestamp_iso === '' && b.timestamp_iso !== '') {
			return 1;
		}

		if (b.timestamp_iso === '' && a.timestamp_iso !== '') {
			return -1;
		}

		const tsCompare = b.timestamp_iso.localeCompare(a.timestamp_iso);
		if (tsCompare !== 0) {
			return tsCompare;
		}

		const tokenCompare = a.token_symbol.localeCompare(b.token_symbol);
		if (tokenCompare !== 0) {
			return tokenCompare;
		}

		return directionRank(b.direction) - directionRank(a.direction);
	});

export interface UserAddresses {
	btc?: Nullish<string>;
	eth?: Nullish<string>;
	icp?: Nullish<string>;
	sol?: Nullish<string>;
}

// Tokens model the on-chain identifier under different field names depending on the standard
// (ICRC ledgers, ERC20 contracts, SPL mints). For a flat CSV we surface whichever is present;
// native tokens have neither and the column is left empty.
const getAddressOrLedgerId = (token: Token | TokenUi): string => {
	const candidate = token as (Token | TokenUi) & {
		ledgerCanisterId?: unknown;
		address?: unknown;
	};

	if (typeof candidate.ledgerCanisterId === 'string') {
		return candidate.ledgerCanisterId;
	}

	if (typeof candidate.address === 'string') {
		return candidate.address;
	}

	return '';
};

const formatAmount = ({ value, decimals }: { value: Nullish<bigint>; decimals: number }): string =>
	nonNullish(value) ? formatUnits(value, decimals) : '';

// `exchangeRateToUsd` follows the same convention as the rest of the app
// (see format.utils.ts:248): it expresses "1 unit of the user's currency = X USD",
// so to convert a USD value to the user's currency we divide by the rate.
const toUserCurrencyValue = ({
	usdValue,
	exchangeRateToUsd
}: {
	usdValue: number | undefined;
	exchangeRateToUsd: number | null;
}): number | undefined => {
	if (isNullish(usdValue) || isNullish(exchangeRateToUsd) || exchangeRateToUsd === 0) {
		return undefined;
	}

	return usdValue / exchangeRateToUsd;
};

export const buildTokenRows = ({
	tokens,
	currency,
	exchangeRateToUsd
}: {
	tokens: TokenUi[];
	currency: Currency;
	exchangeRateToUsd: number | null;
}): TokenCsvRow[] =>
	tokens.map((token) => {
		// A zero balance is worth zero in every currency regardless of whether the price feed
		// has loaded — short-circuit the derivation so the export doesn't emit an empty value
		// cell for a balance the user can already see is empty. Null / undefined balances
		// stay unknown (the loader hasn't returned yet).
		const isZeroBalance = token.balance === ZERO;

		return {
			symbol: token.symbol,
			name: token.name,
			network: token.network.name,
			standard: token.standard.code,
			address_or_ledger_id: getAddressOrLedgerId(token),
			decimals: token.decimals,
			// `balance` stays decimal-formatted for the Basic export (human-readable).
			// `balance_raw` is the raw integer (smallest unit) the Extended export emits —
			// pair it with the Decimals column to recover the decimal value with full
			// precision.
			balance: formatAmount({ value: token.balance, decimals: token.decimals }),
			balance_raw: nonNullish(token.balance) ? token.balance.toString() : '',
			usd_price: token.usdPrice,
			usd_value: isZeroBalance ? 0 : token.usdBalance,
			currency: currency.toUpperCase(),
			price: toUserCurrencyValue({ usdValue: token.usdPrice, exchangeRateToUsd }),
			value: isZeroBalance
				? 0
				: toUserCurrencyValue({ usdValue: token.usdBalance, exchangeRateToUsd })
		};
	});

// Decimals of the native chain currency used to pay gas/fees. ETH, BNB, MATIC, AVAX
// all use 18; SOL uses 9; BTC uses 8.
const EVM_NATIVE_DECIMALS = 18;
const SOL_NATIVE_DECIMALS = 9;
const BTC_DECIMALS = 8;

const normalizeType = (rawType: string): string => {
	const t = rawType.toLowerCase();

	// `withdraw` and `deposit` originate from the EVM ck-minter mapper in
	// eth/utils/transactions.utils.ts: `withdraw` is the minter releasing funds *to* the
	// user (so incoming for the user), and `deposit` is the user sending *to* the minter
	// (so outgoing for the user).
	if (['send', 'sent', 'deposit'].includes(t)) {
		return 'send';
	}

	if (['receive', 'received', 'withdraw'].includes(t)) {
		return 'receive';
	}

	if (t === 'mint') {
		return 'mint';
	}

	if (t === 'burn') {
		return 'burn';
	}

	if (t === 'approve') {
		return 'approve';
	}

	return 'other';
};

// Networks disagree on the unit: ICP uses bigint nanoseconds, Solana uses bigint seconds
// (blockTime), EVM uses a number of seconds (ethers). normalizeTimestampToSeconds detects
// the unit by magnitude (the same heuristic already shared across the per-chain code).
// Empty when the source value is missing.
const formatTimestamp = (timestamp: bigint | number | undefined): string => {
	if (isNullish(timestamp)) {
		return '';
	}

	return new Date(normalizeTimestampToSeconds(timestamp) * 1000).toISOString();
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

// Same source value as formatTimestamp, rendered as `YYYY-MM-DD HH:MM:SS` in the browser's
// local timezone. The format is locale-agnostic and parses cleanly as a datetime across
// Excel / Google Sheets / Numbers, so the user can sort, filter and use it in formulas
// without doing a manual text-to-date conversion. The timezone offset itself isn't part of
// the value — the export is the user's own snapshot in their own timezone.
const formatTimestampLocal = (timestamp: bigint | number | undefined): string => {
	if (isNullish(timestamp)) {
		return '';
	}

	const date = new Date(normalizeTimestampToSeconds(timestamp) * 1000);
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

// UTC counterpart of formatTimestampLocal — same format, but the values are taken from
// the date's UTC components ("Zulu" time). Used by the Extended export so a user can
// share their CSV with someone in another timezone and the rows still compare cleanly.
const formatTimestampUtc = (timestamp: bigint | number | undefined): string => {
	if (isNullish(timestamp)) {
		return '';
	}

	const date = new Date(normalizeTimestampToSeconds(timestamp) * 1000);
	return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
};

// Title-cases a normalized transaction type for the human-facing Basic export (e.g.
// 'send' → 'Send', 'approve' → 'Approve'). Empty input stays empty.
const formatTypeDisplay = (type: string): string =>
	type === '' ? '' : type.charAt(0).toUpperCase() + type.slice(1);

// Constructs a block-explorer URL for a transaction from the network's `explorerUrl`
// template + the chain's tx-path segment. Mirrors what BtcTransactionModal,
// EthTransactionModal and SolTransactionModal do on the fly when the indexer doesn't
// pre-populate tx.txExplorerUrl. Handles both URL conventions in `explorers.env.ts`:
// templated URLs containing `$args` (Solana — substituted with `<txPath>/<id>/`) and
// plain base URLs (BTC, EVM, IC — appended with `/<txPath>/<id>`). ICP uses
// `transaction` as its path; the other chains all use `tx`.
const buildTxExplorerUrl = ({
	template,
	txId,
	txPath = 'tx'
}: {
	template: string;
	txId: string;
	txPath?: string;
}): string => {
	if (template === '' || txId === '') {
		return '';
	}

	if (template.includes('$args')) {
		return replacePlaceholders(template, { $args: `${txPath}/${txId}/` });
	}

	return `${template}/${txPath}/${txId}`;
};

const addressesEqual = ({ a, b }: { a: Nullish<string>; b: Nullish<string> }): boolean =>
	nonNullish(a) && nonNullish(b) && a.toLowerCase() === b.toLowerCase();

const toBitcoinRow = ({
	transaction: tx,
	token,
	userAddress,
	exportedAt
}: {
	transaction: BtcTransactionUi;
	token: Token;
	userAddress: Nullish<string>;
	exportedAt: string;
}): TransactionCsvRow => {
	const type = normalizeType(tx.type);
	const recipients = tx.to ?? [];
	const direction: string =
		type === 'send'
			? 'out'
			: type === 'receive'
				? 'in'
				: nonNullish(userAddress) &&
					  recipients.some((r) => addressesEqual({ a: r, b: userAddress }))
					? 'in'
					: '';

	return {
		timestamp_iso: formatTimestamp(tx.timestamp),
		timestamp_local: formatTimestampLocal(tx.timestamp),
		timestamp_utc: formatTimestampUtc(tx.timestamp),
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_display: formatTypeDisplay(type),
		type_raw: tx.type,
		direction,
		status: tx.status,
		from: tx.from ?? '',
		to: recipients.join(';'),
		amount: formatAmount({ value: tx.value, decimals: token.decimals }),
		amount_raw: tx.value ?? undefined,
		fee: formatAmount({ value: tx.fee, decimals: BTC_DECIMALS }),
		fee_raw: tx.fee ?? undefined,
		fee_token: 'BTC',
		// counterparty + credit/debit/fee_token_debit (and their *_raw twins) + effective_*
		// are filled in by finalizeRow once direction + contacts + self-transfer are known.
		counterparty: '',
		credit: '',
		credit_raw: undefined,
		debit: '',
		debit_raw: undefined,
		fee_token_debit: '',
		fee_token_debit_raw: undefined,
		effective_token: '',
		effective_fee_token: '',
		tx_id: tx.id,
		explorer_url:
			tx.txExplorerUrl ?? buildTxExplorerUrl({ template: token.network.explorerUrl, txId: tx.id }),
		exported_at: exportedAt
	};
};

const toEthereumRow = ({
	transaction: tx,
	token,
	userAddress,
	nativeSymbolByNetworkId,
	exportedAt
}: {
	transaction: EthTransactionUi;
	token: Token;
	userAddress: Nullish<string>;
	nativeSymbolByNetworkId: (networkId: NetworkId) => string | undefined;
	exportedAt: string;
}): TransactionCsvRow => {
	const type = normalizeType(tx.type);
	const direction: string =
		type === 'send'
			? 'out'
			: type === 'receive'
				? 'in'
				: addressesEqual({ a: tx.from, b: userAddress })
					? 'out'
					: addressesEqual({ a: tx.to, b: userAddress })
						? 'in'
						: '';

	const status: string = nonNullish(tx.blockNumber)
		? 'confirmed'
		: nonNullish(tx.pendingTimestamp)
			? 'pending'
			: '';

	const gasFee: bigint | undefined =
		nonNullish(tx.gasUsed) && nonNullish(tx.gasPrice) ? tx.gasUsed * tx.gasPrice : undefined;

	return {
		timestamp_iso: formatTimestamp(tx.timestamp),
		timestamp_local: formatTimestampLocal(tx.timestamp),
		timestamp_utc: formatTimestampUtc(tx.timestamp),
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_display: formatTypeDisplay(type),
		type_raw: tx.type,
		direction,
		status,
		from: tx.from,
		to: tx.to ?? '',
		amount: formatAmount({ value: tx.value as bigint | undefined, decimals: token.decimals }),
		amount_raw: (tx.value as bigint | undefined) ?? undefined,
		fee: formatAmount({ value: gasFee, decimals: EVM_NATIVE_DECIMALS }),
		fee_raw: gasFee,
		fee_token: nativeSymbolByNetworkId(token.network.id) ?? '',
		counterparty: '',
		credit: '',
		credit_raw: undefined,
		debit: '',
		debit_raw: undefined,
		fee_token_debit: '',
		fee_token_debit_raw: undefined,
		effective_token: '',
		effective_fee_token: '',
		tx_id: tx.hash ?? '',
		explorer_url: buildTxExplorerUrl({
			template: token.network.explorerUrl,
			txId: tx.hash ?? ''
		}),
		exported_at: exportedAt
	};
};

// IC tokens carry a `mintingAccount` that the protocol uses to issue and absorb supply.
// The activity page (IcTransaction.svelte) surfaces it as the "from" side of mint rows
// (tokens come from the minter) and as the "to" side of burn rows (tokens go back to the
// minter) — the indexer leaves those fields blank otherwise.
const getIcMintingAccount = (token: Token): string | undefined => {
	if (!isIcToken(token) || isNullish(token.mintingAccount)) {
		return undefined;
	}

	return encodeIcrcAccount(token.mintingAccount);
};

const toIcRow = ({
	transaction: tx,
	token,
	exportedAt
}: {
	transaction: IcTransactionUi;
	token: Token;
	exportedAt: string;
}): TransactionCsvRow => {
	const direction: string = tx.incoming === true ? 'in' : tx.incoming === false ? 'out' : '';
	const type = normalizeType(tx.type);
	const minter = getIcMintingAccount(token);
	// Mirror IcTransaction.svelte's listFrom/listTo logic so the CSV reads the same way as
	// the activity page: mints surface the minter as From (tokens are issued from it), burns
	// surface the minter as To (tokens are sent back), and approves surface the spender as To
	// (the indexer leaves tx.to undefined and stores the spender on tx.approveSpender).
	const from = type === 'mint' && nonNullish(minter) ? minter : (tx.from ?? '');
	const to =
		type === 'approve' && nonNullish(tx.approveSpender)
			? tx.approveSpender
			: type === 'burn' && nonNullish(minter)
				? minter
				: (tx.to ?? '');

	return {
		timestamp_iso: formatTimestamp(tx.timestamp),
		timestamp_local: formatTimestampLocal(tx.timestamp),
		timestamp_utc: formatTimestampUtc(tx.timestamp),
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_display: formatTypeDisplay(type),
		type_raw: tx.type,
		direction,
		status: tx.status,
		from,
		to,
		amount: formatAmount({ value: tx.value, decimals: token.decimals }),
		amount_raw: tx.value ?? undefined,
		fee: formatAmount({ value: tx.fee, decimals: token.decimals }),
		fee_raw: tx.fee ?? undefined,
		fee_token: token.symbol,
		counterparty: '',
		credit: '',
		credit_raw: undefined,
		debit: '',
		debit_raw: undefined,
		fee_token_debit: '',
		fee_token_debit_raw: undefined,
		effective_token: '',
		effective_fee_token: '',
		tx_id: String(tx.id),
		// ICRC mapper leaves txExplorerUrl undefined (only native ICP pre-populates it).
		// Fall back to the network template — IC uses `/transaction/` as the path segment,
		// not `/tx/`, so override the default.
		explorer_url:
			tx.txExplorerUrl ??
			buildTxExplorerUrl({
				template: token.network.explorerUrl,
				txId: String(tx.id),
				txPath: 'transaction'
			}),
		exported_at: exportedAt
	};
};

const toSolanaRow = ({
	transaction: tx,
	token,
	userAddress,
	exportedAt
}: {
	transaction: SolTransactionUi;
	token: Token;
	userAddress: Nullish<string>;
	exportedAt: string;
}): TransactionCsvRow => {
	const type = normalizeType(tx.type);
	const from = tx.fromOwner ?? tx.from;
	const to = tx.toOwner ?? tx.to;
	const direction: string =
		type === 'send'
			? 'out'
			: type === 'receive'
				? 'in'
				: addressesEqual({ a: from, b: userAddress })
					? 'out'
					: addressesEqual({ a: to, b: userAddress })
						? 'in'
						: '';

	return {
		timestamp_iso: formatTimestamp(tx.timestamp),
		timestamp_local: formatTimestampLocal(tx.timestamp),
		timestamp_utc: formatTimestampUtc(tx.timestamp),
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_display: formatTypeDisplay(type),
		type_raw: tx.type,
		direction,
		status: tx.status ?? '',
		from: from ?? '',
		to: to ?? '',
		amount: formatAmount({ value: tx.value, decimals: token.decimals }),
		amount_raw: tx.value ?? undefined,
		fee: formatAmount({ value: tx.fee, decimals: SOL_NATIVE_DECIMALS }),
		fee_raw: tx.fee ?? undefined,
		fee_token: 'SOL',
		counterparty: '',
		credit: '',
		credit_raw: undefined,
		debit: '',
		debit_raw: undefined,
		fee_token_debit: '',
		fee_token_debit_raw: undefined,
		effective_token: '',
		effective_fee_token: '',
		tx_id: String(tx.signature),
		// SolTransactionUi doesn't pre-populate txExplorerUrl. Construct it from the
		// network template (e.g. solscan.io/$args → solscan.io/tx/<signature>/), same way
		// SolTransactionModal does.
		explorer_url:
			tx.txExplorerUrl ??
			buildTxExplorerUrl({
				template: token.network.explorerUrl,
				txId: String(tx.signature)
			}),
		exported_at: exportedAt
	};
};

// Negates a decimal-string amount, suppressing "-0" for zero values.
const negate = (decimal: string): string => {
	if (decimal === '') {
		return '';
	}

	if (parseFloat(decimal) === 0) {
		return decimal.replace(/^-/, '');
	}

	return decimal.startsWith('-') ? decimal.slice(1) : `-${decimal}`;
};

// Sums two decimal strings via Decimal.js so we keep full precision even at 18-decimal
// EVM scale. Empty inputs are treated as missing rather than as zero; if either side is
// missing we return the other (or empty if both are).
const sumDecimals = ({ a, b }: { a: string; b: string }): string => {
	if (a === '' && b === '') {
		return '';
	}

	if (a === '') {
		return b;
	}

	if (b === '') {
		return a;
	}

	return new Decimal(a).plus(new Decimal(b)).toFixed();
};

// Resolves the active counterparty address (to-address on outgoing, from-address on
// incoming) through the address book, mirroring the activity page's contact lookup. If a
// contact matches, returns "Name" — or "Name (Label)" when the specific address has a
// non-empty label set. Otherwise returns the raw address.
const formatCounterparty = ({
	address,
	contacts
}: {
	address: string;
	contacts: ContactUi[];
}): string => {
	if (address === '') {
		return '';
	}

	const contact = getContactForAddress({ addressString: address, contactList: contacts });
	if (isNullish(contact)) {
		return address;
	}

	const matched = filterAddressFromContact({ contact, address });
	const label = matched?.label;
	return notEmptyString(label) ? `${contact.name} (${label})` : contact.name;
};

// Fills in counterparty + effective_token / effective_fee_token and blanks the fee on
// incoming rows (where the sender, or — for ICRC self-transfer duplicates — the matching
// outgoing row already accounts for it). When the asset and fee share the same token
// symbol, the signed fee is folded into effective_token so a single column sum reconciles.
const finalizeRow = ({
	row,
	isSelfTransfer,
	isStandaloneRoundTrip,
	contacts
}: {
	row: TransactionCsvRow;
	isSelfTransfer: boolean;
	// True when the row is a non-IC self-transfer represented as a single outgoing row —
	// the asset returns to the same wallet within this row, so only the fee actually leaves.
	// ICRC self-transfers are emitted by the indexer as a paired in + out, where the IN
	// duplicate's +Credit cancels the OUT's -Amount; for that case this flag is false.
	isStandaloneRoundTrip: boolean;
	contacts: ContactUi[];
}): TransactionCsvRow => {
	const isApprove = row.type === 'approve';
	const isIncoming = row.direction === 'in';
	const isOutgoing = row.direction === 'out';

	// The user paid the fee only on the outgoing row. ICRC self-transfers are emitted twice
	// by the indexer (one 'out' + one 'in' for the same on-chain tx); attributing the fee to
	// the outgoing row only keeps the sum honest. Non-self incoming rows: the sender paid.
	const userPaidFee = isOutgoing;

	// Signed change to the user's main-asset balance for this row.
	// Approve and self-transfer rows contribute zero — approve doesn't move the asset, and a
	// self-transfer's asset returns to the same wallet.
	let assetSigned = '';
	if (row.amount !== '') {
		if (isApprove || isSelfTransfer) {
			assetSigned = '0';
		} else if (isIncoming) {
			assetSigned = row.amount;
		} else if (isOutgoing) {
			assetSigned = negate(row.amount);
		}
	}

	// Signed change to the fee-token balance for this row.
	// On incoming rows (and the incoming duplicate of an ICRC self-transfer) the user did
	// not pay a fee, so the effective fee stays empty — sumDecimals treats `''` the same
	// as `'0'` when folding into effective_token, so leaving it blank only changes what
	// shows up in the visible Fee column.
	let feeSigned = '';
	if (userPaidFee && row.fee !== '') {
		feeSigned = negate(row.fee);
	}

	// When the fee is paid in the same token as the asset, fold the two signed values into
	// effective_token so the user can sum a single column per token to reconcile.
	const mergeColumns = row.fee_token !== '' && row.fee_token === row.token_symbol;
	const effective_token = mergeColumns
		? sumDecimals({ a: assetSigned, b: feeSigned })
		: assetSigned;
	const effective_fee_token = mergeColumns ? '' : feeSigned;

	const counterpartyAddress = isOutgoing ? row.to : isIncoming ? row.from : '';
	const counterparty = formatCounterparty({ address: counterpartyAddress, contacts });

	const fee = userPaidFee ? row.fee : '';
	const fee_token = userPaidFee ? row.fee_token : '';

	// Basic-export accounting columns. Credit/Debit/Fee Token Debit are signed; Amount and
	// Fee in their own columns stay positive for human readability. Approve rows contribute
	// only the fee to Debit since the allowance itself doesn't move the user's balance.
	const credit = isIncoming && row.amount !== '' ? row.amount : '';

	let debit = '';
	if (isOutgoing) {
		// Zero the asset portion for approve rows (allowance doesn't move) and for
		// non-IC self-transfers (asset returns to the same wallet within this row). ICRC
		// self-transfer OUTs keep -amount so the IN duplicate's +Credit nets them.
		const assetPortion = isApprove || isStandaloneRoundTrip ? '0' : row.amount;
		const feePortion = mergeColumns ? fee : '';
		const total = sumDecimals({ a: assetPortion, b: feePortion });
		if (total !== '' && parseFloat(total) !== 0) {
			debit = negate(total);
		}
	}

	const fee_token_debit = isOutgoing && !mergeColumns && fee !== '' ? negate(fee) : '';

	// Bigint twins of the accounting columns for the Extended export, which emits raw
	// integers (no decimal point) — mirrors the Basic-vs-Extended balance split on tokens.
	const credit_raw = isIncoming && nonNullish(row.amount_raw) ? row.amount_raw : undefined;

	let debit_raw: bigint | undefined;
	if (isOutgoing) {
		const assetPortionRaw = isApprove || isStandaloneRoundTrip ? ZERO : (row.amount_raw ?? ZERO);
		const feePortionRaw = mergeColumns ? (row.fee_raw ?? ZERO) : ZERO;
		const totalRaw = assetPortionRaw + feePortionRaw;
		if (totalRaw !== ZERO) {
			debit_raw = -totalRaw;
		}
	}

	const fee_token_debit_raw =
		isOutgoing && !mergeColumns && nonNullish(row.fee_raw) && row.fee_raw !== ZERO
			? -row.fee_raw
			: undefined;

	return {
		...row,
		fee,
		fee_token,
		counterparty,
		credit,
		credit_raw,
		debit,
		debit_raw,
		fee_token_debit,
		fee_token_debit_raw,
		effective_token,
		effective_fee_token
	};
};

export const buildTransactionRows = ({
	transactions,
	userAddresses,
	nativeSymbolByNetworkId,
	contacts,
	exportedAt
}: {
	transactions: AllTransactionUiWithCmp[];
	userAddresses: UserAddresses;
	nativeSymbolByNetworkId: (networkId: NetworkId) => string | undefined;
	contacts: ContactUi[];
	exportedAt: Date;
}): TransactionCsvRow[] => {
	const exportedAtIso = exportedAt.toISOString();

	return transactions.map((entry) => {
		let row: TransactionCsvRow;
		// BTC: tx.value is already net of change, so self-transfer detection is unnecessary
		// (and ambiguous with multi-recipient txs). Default to false.
		let isSelfTransfer = false;
		// True only when the row IS a single-row representation of a self-transfer (asset
		// returns within the same row, no companion row from the indexer). ICRC is the
		// exception — it emits a paired in + out, so the OUT row should NOT zero its asset
		// portion (the IN duplicate's +Credit balances it).
		let isStandaloneRoundTrip = false;

		switch (entry.component) {
			case 'bitcoin':
				row = toBitcoinRow({
					transaction: entry.transaction,
					token: entry.token,
					userAddress: userAddresses.btc,
					exportedAt: exportedAtIso
				});
				break;
			case 'ethereum':
				row = toEthereumRow({
					transaction: entry.transaction,
					token: entry.token,
					userAddress: userAddresses.eth,
					nativeSymbolByNetworkId,
					exportedAt: exportedAtIso
				});
				isSelfTransfer = addressesEqual({
					a: entry.transaction.from,
					b: entry.transaction.to
				});
				isStandaloneRoundTrip = isSelfTransfer;
				break;
			case 'ic':
				row = toIcRow({
					transaction: entry.transaction,
					token: entry.token,
					exportedAt: exportedAtIso
				});
				isSelfTransfer = addressesEqual({
					a: entry.transaction.from,
					b: entry.transaction.to
				});
				// IC emits an IN duplicate for self-transfers — see icrc-transactions.utils.ts —
				// so this OUT row is not a standalone round-trip.
				break;
			case 'solana':
				row = toSolanaRow({
					transaction: entry.transaction,
					token: entry.token,
					userAddress: userAddresses.sol,
					exportedAt: exportedAtIso
				});
				isSelfTransfer = addressesEqual({
					a: entry.transaction.fromOwner ?? entry.transaction.from,
					b: entry.transaction.toOwner ?? entry.transaction.to
				});
				isStandaloneRoundTrip = isSelfTransfer;
				break;
		}

		return finalizeRow({ row, isSelfTransfer, isStandaloneRoundTrip, contacts });
	});
};
