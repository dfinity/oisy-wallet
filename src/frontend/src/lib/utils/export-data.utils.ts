import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { Currency } from '$lib/enums/currency';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import type { CsvColumn, CsvRow } from '$lib/utils/csv.utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
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

export interface TransactionCsvRow extends CsvRow {
	timestamp_iso: string;
	network: string;
	token_symbol: string;
	token_address_or_ledger_id: string;
	type: string;
	type_raw: string;
	direction: string;
	status: string;
	from: string;
	to: string;
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

const toUserCurrencyValue = ({
	usdValue,
	exchangeRateToUsd
}: {
	usdValue: number | undefined;
	exchangeRateToUsd: number | null;
}): number | undefined =>
	isNullish(exchangeRateToUsd) || isNullish(usdValue) ? undefined : usdValue * exchangeRateToUsd;

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

	if (['send', 'sent', 'withdraw'].includes(t)) {
		return 'send';
	}

	if (['receive', 'received', 'deposit'].includes(t)) {
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

// ICP/BTC/SOL store timestamps as bigint nanoseconds. ETH stores them as a `number` of seconds
// (ethers convention). Empty when the source value is missing.
const formatTimestamp = (timestamp: bigint | number | undefined): string => {
	if (isNullish(timestamp)) {
		return '';
	}

	const millis = typeof timestamp === 'bigint' ? Number(timestamp / 1_000_000n) : timestamp * 1000;

	return new Date(millis).toISOString();
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
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_raw: tx.type,
		direction,
		status: tx.status,
		from: tx.from ?? '',
		to: recipients.join(';'),
		amount: formatAmount({ value: tx.value, decimals: token.decimals }),
		fee: formatAmount({ value: tx.fee, decimals: BTC_DECIMALS }),
		fee_token: 'BTC',
		// effective_* are filled in by finalizeRow once direction + self-transfer are resolved.
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
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_raw: tx.type,
		direction,
		status,
		from: tx.from,
		to: tx.to ?? '',
		amount: formatAmount({ value: tx.value as bigint | undefined, decimals: token.decimals }),
		fee: formatAmount({ value: gasFee, decimals: EVM_NATIVE_DECIMALS }),
		fee_token: nativeSymbolByNetworkId(token.network.id) ?? '',
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

	return {
		timestamp_iso: formatTimestamp(tx.timestamp),
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type: normalizeType(tx.type),
		type_raw: tx.type,
		direction,
		status: tx.status,
		from: tx.from ?? '',
		to: tx.to ?? '',
		amount: formatAmount({ value: tx.value, decimals: token.decimals }),
		fee: formatAmount({ value: tx.fee, decimals: token.decimals }),
		fee_token: token.symbol,
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
		network: token.network.name,
		token_symbol: token.symbol,
		token_address_or_ledger_id: getAddressOrLedgerId(token),
		type,
		type_raw: tx.type,
		direction,
		status: tx.status ?? '',
		from: from ?? '',
		to: to ?? '',
		amount: formatAmount({ value: tx.value, decimals: token.decimals }),
		fee: formatAmount({ value: tx.fee, decimals: SOL_NATIVE_DECIMALS }),
		fee_token: 'SOL',
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

// Fills in effective_token / effective_fee_token and blanks the fee on incoming rows
// (where the sender, or — for ICRC self-transfer duplicates — the matching outgoing row
// already accounts for it). When the asset and fee share the same token symbol, the
// signed fee is folded into effective_token so a single column sum reconciles.
const finalizeRow = ({
	row,
	isSelfTransfer
}: {
	row: TransactionCsvRow;
	isSelfTransfer: boolean;
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

	return {
		...row,
		fee: userPaidFee ? row.fee : '',
		fee_token: userPaidFee ? row.fee_token : '',
		effective_token,
		effective_fee_token
	};
};

export const buildTransactionRows = ({
	transactions,
	userAddresses,
	nativeSymbolByNetworkId,
	exportedAt
}: {
	transactions: AllTransactionUiWithCmp[];
	userAddresses: UserAddresses;
	nativeSymbolByNetworkId: (networkId: NetworkId) => string | undefined;
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

		return finalizeRow({ row, isSelfTransfer });
	});
};
