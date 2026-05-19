import type { Currency } from '$lib/enums/currency';
import type { TokenUi } from '$lib/types/token-ui';
import type { CsvColumn, CsvRow } from '$lib/utils/csv.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
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

// Tokens model the on-chain identifier under different field names depending on the standard
// (ICRC ledgers, ERC20 contracts, SPL mints). For a flat CSV we surface whichever is present;
// native tokens have neither and the column is left empty.
const getAddressOrLedgerId = (token: TokenUi): string => {
	const candidate = token as TokenUi & {
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

const formatBalance = ({
	value,
	decimals
}: {
	value: Nullish<bigint>;
	decimals: number;
}): string => (nonNullish(value) ? formatUnits(value, decimals) : '');

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
		balance: formatBalance({ value: token.balance, decimals: token.decimals }),
		usd_price: token.usdPrice,
		usd_value: token.usdBalance,
		currency: currency.toUpperCase(),
		price: toUserCurrencyValue({ usdValue: token.usdPrice, exchangeRateToUsd }),
		value: toUserCurrencyValue({ usdValue: token.usdBalance, exchangeRateToUsd }),
		snapshot_at: snapshotAt
	}));
};
