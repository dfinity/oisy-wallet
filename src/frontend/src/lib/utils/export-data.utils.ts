import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import type { Currency } from '$lib/enums/currency';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import { filterAddressFromContact, getContactForAddress } from '$lib/utils/contact.utils';
import type { CsvColumn, CsvRow } from '$lib/utils/csv.utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
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
	usd_price: number | undefined;
	usd_value: number | undefined;
	currency: string;
	price: number | undefined;
	value: number | undefined;
	snapshot_at: string;
}

export const TOKEN_CSV_COLUMNS: CsvColumn<TokenCsvRow>[] = [
	{ key: 'symbol', header: 'symbol' },
	{ key: 'name', header: 'name' },
	{ key: 'network', header: 'network' },
	{ key: 'standard', header: 'standard' },
	{ key: 'address_or_ledger_id', header: 'address_or_ledger_id' },
	{ key: 'decimals', header: 'decimals' },
	{ key: 'balance', header: 'balance' },
	{ key: 'usd_price', header: 'usd_price' },
	{ key: 'usd_value', header: 'usd_value' },
	{ key: 'currency', header: 'currency' },
	{ key: 'price', header: 'price' },
	{ key: 'value', header: 'value' },
	{ key: 'snapshot_at', header: 'snapshot_at' }
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

// Sorts the Basic export lexicographically by network → symbol → name. Locale-aware so users
// on non-English locales still see a natural ordering. Returns a new array — the input is
// not mutated.
export const sortBasicTokenRows = (rows: TokenCsvRow[]): TokenCsvRow[] =>
	[...rows].sort(
		(a, b) =>
			a.network.localeCompare(b.network) ||
			a.symbol.localeCompare(b.symbol) ||
			a.name.localeCompare(b.name)
	);

export interface TransactionCsvRow extends CsvRow {
	timestamp_iso: string;
	timestamp_local: string;
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
	fee: string;
	fee_token: string;
	effective_token: string;
	effective_fee_token: string;
	tx_id: string;
	explorer_url: string;
	exported_at: string;
}

export const TRANSACTION_CSV_COLUMNS: CsvColumn<TransactionCsvRow>[] = [
	{ key: 'timestamp_iso', header: 'timestamp_iso' },
	{ key: 'network', header: 'network' },
	{ key: 'token_symbol', header: 'token_symbol' },
	{ key: 'token_address_or_ledger_id', header: 'token_address_or_ledger_id' },
	{ key: 'type', header: 'type' },
	{ key: 'type_raw', header: 'type_raw' },
	{ key: 'direction', header: 'direction' },
	{ key: 'status', header: 'status' },
	{ key: 'from', header: 'from' },
	{ key: 'to', header: 'to' },
	{ key: 'amount', header: 'amount' },
	{ key: 'fee', header: 'fee' },
	{ key: 'fee_token', header: 'fee_token' },
	{ key: 'effective_token', header: 'effective_token' },
	{ key: 'effective_fee_token', header: 'effective_fee_token' },
	{ key: 'tx_id', header: 'tx_id' },
	{ key: 'explorer_url', header: 'explorer_url' },
	{ key: 'exported_at', header: 'exported_at' }
];

// Slim variant for the Basic transactions export — 11 spreadsheet-friendly columns.
// Timestamp is the user-locale, browser-timezone version (matches what the app shows on
// rows); Type is title-cased; Counterparty resolves the active side (To on outgoing, From
// on incoming) through the address book — same lookup as the activity page — and falls
// back to the raw address. Amount and Fee read from effective_token / effective_fee_token
// so a per-token column sum already accounts for self-transfer dedup and same-token merge.
// Headers are title-cased to match the Basic tokens variant.
export const BASIC_TRANSACTION_CSV_COLUMNS: CsvColumn<TransactionCsvRow>[] = [
	{ key: 'timestamp_local', header: 'Timestamp' },
	{ key: 'network', header: 'Network' },
	{ key: 'token_symbol', header: 'Symbol' },
	{ key: 'type_display', header: 'Type' },
	{ key: 'counterparty', header: 'Counterparty' },
	{ key: 'from', header: 'From' },
	{ key: 'to', header: 'To' },
	{ key: 'effective_token', header: 'Amount' },
	{ key: 'fee_token', header: 'Fee Token' },
	{ key: 'effective_fee_token', header: 'Fee' },
	{ key: 'tx_id', header: 'Transaction ID' }
];

// Sorts the Basic transactions export by timestamp descending — newest first, the natural
// activity-feed order. Rows without a parseable timestamp sink to the bottom rather than
// jumping to either end.
export const sortBasicTransactionRows = (rows: TransactionCsvRow[]): TransactionCsvRow[] =>
	[...rows].sort((a, b) => {
		if (a.timestamp_iso === '' && b.timestamp_iso === '') {
			return 0;
		}

		if (a.timestamp_iso === '') {
			return 1;
		}

		if (b.timestamp_iso === '') {
			return -1;
		}

		return b.timestamp_iso.localeCompare(a.timestamp_iso);
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
	exchangeRateToUsd,
	exportedAt
}: {
	tokens: TokenUi[];
	currency: Currency;
	exchangeRateToUsd: number | null;
	exportedAt: Date;
}): TokenCsvRow[] => {
	const snapshotAt = exportedAt.toISOString();

	return tokens.map((token) => ({
		symbol: token.symbol,
		name: token.name,
		network: token.network.name,
		standard: token.standard.code,
		address_or_ledger_id: getAddressOrLedgerId(token),
		decimals: token.decimals,
		balance: formatAmount({ value: token.balance, decimals: token.decimals }),
		usd_price: token.usdPrice,
		usd_value: token.usdBalance,
		currency: currency.toUpperCase(),
		price: toUserCurrencyValue({ usdValue: token.usdPrice, exchangeRateToUsd }),
		value: toUserCurrencyValue({ usdValue: token.usdBalance, exchangeRateToUsd }),
		snapshot_at: snapshotAt
	}));
};

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

// Title-cases a normalized transaction type for the human-facing Basic export (e.g.
// 'send' → 'Send', 'approve' → 'Approve'). Empty input stays empty.
const formatTypeDisplay = (type: string): string =>
	type === '' ? '' : type.charAt(0).toUpperCase() + type.slice(1);

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
		fee: formatAmount({ value: tx.fee, decimals: BTC_DECIMALS }),
		fee_token: 'BTC',
		// counterparty + effective_* are filled in by finalizeRow once direction + contacts +
		// self-transfer are known.
		counterparty: '',
		effective_token: '',
		effective_fee_token: '',
		tx_id: tx.id,
		explorer_url: tx.txExplorerUrl ?? '',
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
		fee: formatAmount({ value: gasFee, decimals: EVM_NATIVE_DECIMALS }),
		fee_token: nativeSymbolByNetworkId(token.network.id) ?? '',
		counterparty: '',
		effective_token: '',
		effective_fee_token: '',
		tx_id: tx.hash ?? '',
		explorer_url: '',
		exported_at: exportedAt
	};
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

	return {
		timestamp_iso: formatTimestamp(tx.timestamp),
		timestamp_local: formatTimestampLocal(tx.timestamp),
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_display: formatTypeDisplay(type),
		type_raw: tx.type,
		direction,
		status: tx.status,
		from: tx.from ?? '',
		to: tx.to ?? '',
		amount: formatAmount({ value: tx.value, decimals: token.decimals }),
		fee: formatAmount({ value: tx.fee, decimals: token.decimals }),
		fee_token: token.symbol,
		counterparty: '',
		effective_token: '',
		effective_fee_token: '',
		tx_id: String(tx.id),
		explorer_url: tx.txExplorerUrl ?? '',
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
		fee: formatAmount({ value: tx.fee, decimals: SOL_NATIVE_DECIMALS }),
		fee_token: 'SOL',
		counterparty: '',
		effective_token: '',
		effective_fee_token: '',
		tx_id: String(tx.signature),
		explorer_url: tx.txExplorerUrl ?? '',
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
	contacts
}: {
	row: TransactionCsvRow;
	isSelfTransfer: boolean;
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
	let feeSigned = '';
	if (userPaidFee) {
		feeSigned = row.fee === '' ? '' : negate(row.fee);
	} else if (isIncoming) {
		feeSigned = '0';
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

	return {
		...row,
		fee: userPaidFee ? row.fee : '',
		fee_token: userPaidFee ? row.fee_token : '',
		counterparty,
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
				break;
		}

		return finalizeRow({ row, isSelfTransfer, contacts });
	});
};
