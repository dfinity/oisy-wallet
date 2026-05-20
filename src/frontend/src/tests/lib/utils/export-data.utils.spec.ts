import type { BtcTransactionUi } from '$btc/types/btc';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { ZERO } from '$lib/constants/app.constants';
import { Currency } from '$lib/enums/currency';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import {
	BASIC_TOKEN_CSV_COLUMNS,
	BASIC_TRANSACTION_CSV_COLUMNS,
	buildTokenRows,
	buildTransactionRows,
	sortBasicTokenRows,
	sortBasicTransactionRows,
	TOKEN_CSV_COLUMNS,
	TRANSACTION_CSV_COLUMNS,
	type TokenCsvRow,
	type TransactionCsvRow
} from '$lib/utils/export-data.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { signature } from '@solana/kit';

const TOKEN_TAGS: Token['tags'] = [
	{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
];

const baseToken: TokenUi = {
	id: parseTokenId('test'),
	network: ICP_NETWORK,
	standard: { code: 'icrc' },
	category: 'default',
	tags: TOKEN_TAGS,
	name: 'Test Token',
	symbol: 'TST',
	decimals: 8
};

describe('export-data.utils', () => {
	describe('buildTokenRows', () => {
		const exportedAt = new Date('2026-05-19T08:30:00Z');

		it('maps a token with full financial data to a row', () => {
			// exchangeRateToUsd = 2 means "1 EUR = 2 USD" (hypothetical, chosen for clean
			// arithmetic). To convert USD → EUR we divide: usd / rate.
			const rows = buildTokenRows({
				tokens: [
					{
						...baseToken,
						balance: 12345678n,
						usdPrice: 10,
						usdBalance: 1.2345678
					}
				],
				currency: Currency.EUR,
				exchangeRateToUsd: 2,
				exportedAt
			});

			expect(rows).toHaveLength(1);
			expect(rows[0]).toEqual<TokenCsvRow>({
				symbol: 'TST',
				name: 'Test Token',
				network: ICP_NETWORK.name,
				standard: 'icrc',
				address_or_ledger_id: '',
				decimals: 8,
				balance: '0.12345678',
				usd_price: 10,
				usd_value: 1.2345678,
				currency: 'EUR',
				price: 5,
				value: 0.6172839,
				snapshot_at: '2026-05-19T08:30:00.000Z'
			});
		});

		it('leaves price and value undefined when the exchange rate is zero', () => {
			// Defensive guard: matches format.utils.ts:241 to avoid division by zero.
			const [row] = buildTokenRows({
				tokens: [{ ...baseToken, balance: 1n, usdPrice: 1, usdBalance: 1 }],
				currency: Currency.EUR,
				exchangeRateToUsd: 0,
				exportedAt
			});

			expect(row.price).toBeUndefined();
			expect(row.value).toBeUndefined();
		});

		it('leaves price and value undefined when the exchange rate has not loaded', () => {
			const [row] = buildTokenRows({
				tokens: [{ ...baseToken, balance: 1n, usdPrice: 1, usdBalance: 1 }],
				currency: Currency.EUR,
				exchangeRateToUsd: null,
				exportedAt
			});

			expect(row.price).toBeUndefined();
			expect(row.value).toBeUndefined();
			expect(row.usd_price).toBe(1);
			expect(row.usd_value).toBe(1);
		});

		it('passes USD through unchanged when the exchange rate is 1', () => {
			const [row] = buildTokenRows({
				tokens: [{ ...baseToken, balance: ZERO, usdPrice: 42, usdBalance: 0 }],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.currency).toBe('USD');
			expect(row.price).toBe(42);
			expect(row.value).toBe(0);
		});

		it('renders an empty balance string when the balance is null', () => {
			const [row] = buildTokenRows({
				tokens: [{ ...baseToken, balance: null }],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.balance).toBe('');
		});

		it('formats balance with full precision using the token decimals', () => {
			const [row] = buildTokenRows({
				tokens: [
					{
						...baseToken,
						decimals: 18,
						balance: 1_234_567_890_123_456_789n
					}
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.balance).toBe('1.234567890123456789');
		});

		it('reads ledgerCanisterId for IC tokens that expose it', () => {
			const [row] = buildTokenRows({
				tokens: [
					{
						...baseToken,
						balance: ZERO,
						ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai'
					} as TokenUi
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.address_or_ledger_id).toBe('mxzaz-hqaaa-aaaar-qaada-cai');
		});

		it('reads address for ERC20 / SPL tokens that expose it', () => {
			const [row] = buildTokenRows({
				tokens: [
					{
						...baseToken,
						balance: ZERO,
						address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
					} as TokenUi
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(row.address_or_ledger_id).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
		});

		it('writes the same snapshot_at on every row', () => {
			const rows = buildTokenRows({
				tokens: [
					{ ...baseToken, balance: 1n },
					{ ...baseToken, balance: 2n }
				],
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exportedAt
			});

			expect(rows[0].snapshot_at).toBe('2026-05-19T08:30:00.000Z');
			expect(rows[1].snapshot_at).toBe('2026-05-19T08:30:00.000Z');
		});
	});

	describe('TOKEN_CSV_COLUMNS', () => {
		it('lists the 13 documented columns in order', () => {
			expect(TOKEN_CSV_COLUMNS.map(({ key }) => key)).toEqual([
				'symbol',
				'name',
				'network',
				'standard',
				'address_or_ledger_id',
				'decimals',
				'balance',
				'usd_price',
				'usd_value',
				'currency',
				'price',
				'value',
				'snapshot_at'
			]);
		});
	});

	describe('BASIC_TOKEN_CSV_COLUMNS', () => {
		it('lists the 6 basic-export columns with network first', () => {
			expect(BASIC_TOKEN_CSV_COLUMNS.map(({ key }) => key)).toEqual([
				'network',
				'symbol',
				'name',
				'balance',
				'currency',
				'value'
			]);
		});

		it('uses title-cased human-readable headers (the CSV is meant for spreadsheet users)', () => {
			expect(BASIC_TOKEN_CSV_COLUMNS.map(({ header }) => header)).toEqual([
				'Network',
				'Symbol',
				'Name',
				'Balance',
				'Currency',
				'Value'
			]);
		});

		it('is a strict subset of TOKEN_CSV_COLUMNS so the same row builder feeds both', () => {
			const extendedKeys = new Set(TOKEN_CSV_COLUMNS.map(({ key }) => key));
			BASIC_TOKEN_CSV_COLUMNS.forEach(({ key }) => {
				expect(extendedKeys.has(key)).toBeTruthy();
			});
		});
	});

	describe('sortBasicTokenRows', () => {
		const row = (overrides: Partial<TokenCsvRow>): TokenCsvRow =>
			({ network: '', symbol: '', name: '', ...overrides }) as TokenCsvRow;

		it('sorts by network ascending first', () => {
			const sorted = sortBasicTokenRows([
				row({ network: 'Solana', symbol: 'ZZZ', name: 'Aaa' }),
				row({ network: 'Bitcoin', symbol: 'BBB', name: 'Zzz' }),
				row({ network: 'Ethereum', symbol: 'AAA', name: 'Mmm' })
			]);

			expect(sorted.map(({ network }) => network)).toEqual(['Bitcoin', 'Ethereum', 'Solana']);
		});

		it('breaks network ties by symbol, then by name', () => {
			const sorted = sortBasicTokenRows([
				row({ network: 'Ethereum', symbol: 'USDC', name: 'USD Coin (Bridged)' }),
				row({ network: 'Ethereum', symbol: 'USDC', name: 'USD Coin' }),
				row({ network: 'Ethereum', symbol: 'AAA', name: 'Alpha' })
			]);

			expect(sorted.map(({ symbol, name }) => `${symbol}/${name}`)).toEqual([
				'AAA/Alpha',
				'USDC/USD Coin',
				'USDC/USD Coin (Bridged)'
			]);
		});

		it('does not mutate the input array', () => {
			const input = [
				row({ network: 'Solana', symbol: 'SOL', name: 'Solana' }),
				row({ network: 'Bitcoin', symbol: 'BTC', name: 'Bitcoin' })
			];
			const snapshot = [...input];

			sortBasicTokenRows(input);

			expect(input).toEqual(snapshot);
		});
	});

	describe('TRANSACTION_CSV_COLUMNS', () => {
		it('lists the 18 documented columns in order', () => {
			expect(TRANSACTION_CSV_COLUMNS.map(({ key }) => key)).toEqual([
				'timestamp_iso',
				'network',
				'token_symbol',
				'token_address_or_ledger_id',
				'type',
				'type_raw',
				'direction',
				'status',
				'from',
				'to',
				'amount',
				'fee',
				'fee_token',
				'effective_token',
				'effective_fee_token',
				'tx_id',
				'explorer_url',
				'exported_at'
			]);
		});
	});

	describe('BASIC_TRANSACTION_CSV_COLUMNS', () => {
		it('lists the 11 basic-export columns in the documented order', () => {
			expect(BASIC_TRANSACTION_CSV_COLUMNS.map(({ key }) => key)).toEqual([
				'timestamp_local',
				'network',
				'token_symbol',
				'type_display',
				'counterparty',
				'from',
				'to',
				'effective_token',
				'fee_token_display',
				'effective_fee_token',
				'tx_id'
			]);
		});

		it('uses title-cased human-readable headers', () => {
			expect(BASIC_TRANSACTION_CSV_COLUMNS.map(({ header }) => header)).toEqual([
				'Timestamp',
				'Network',
				'Symbol',
				'Type',
				'Counterparty',
				'From',
				'To',
				'Amount',
				'Fee Token',
				'Fee',
				'Transaction ID'
			]);
		});
	});

	describe('sortBasicTransactionRows', () => {
		const row = (overrides: Partial<TransactionCsvRow>): TransactionCsvRow =>
			({ timestamp_iso: '', ...overrides }) as TransactionCsvRow;

		it('sorts newest first (descending ISO timestamp)', () => {
			const sorted = sortBasicTransactionRows([
				row({ timestamp_iso: '2026-01-01T00:00:00.000Z' }),
				row({ timestamp_iso: '2026-05-17T12:00:00.000Z' }),
				row({ timestamp_iso: '2026-03-15T08:30:00.000Z' })
			]);

			expect(sorted.map(({ timestamp_iso }) => timestamp_iso)).toEqual([
				'2026-05-17T12:00:00.000Z',
				'2026-03-15T08:30:00.000Z',
				'2026-01-01T00:00:00.000Z'
			]);
		});

		it('sinks rows with missing timestamps to the bottom rather than the top', () => {
			const sorted = sortBasicTransactionRows([
				row({ timestamp_iso: '' }),
				row({ timestamp_iso: '2026-05-17T12:00:00.000Z' }),
				row({ timestamp_iso: '' }),
				row({ timestamp_iso: '2026-01-01T00:00:00.000Z' })
			]);

			expect(sorted.map(({ timestamp_iso }) => timestamp_iso)).toEqual([
				'2026-05-17T12:00:00.000Z',
				'2026-01-01T00:00:00.000Z',
				'',
				''
			]);
		});

		it('does not mutate the input array', () => {
			const input = [
				row({ timestamp_iso: '2026-01-01T00:00:00.000Z' }),
				row({ timestamp_iso: '2026-05-17T12:00:00.000Z' })
			];
			const snapshot = [...input];

			sortBasicTransactionRows(input);

			expect(input).toEqual(snapshot);
		});
	});

	describe('buildTransactionRows', () => {
		const exportedAt = new Date('2026-05-19T08:30:00Z');
		const exportedAtIso = '2026-05-19T08:30:00.000Z';

		const TIMESTAMP_ISO = '2026-05-17T12:00:00.000Z';
		const TIMESTAMP_S = Math.floor(new Date(TIMESTAMP_ISO).getTime() / 1000);
		const TIMESTAMP_NS = BigInt(TIMESTAMP_S) * 1_000_000_000n;

		const btcToken: Token = {
			id: parseTokenId('BTC'),
			network: BTC_MAINNET_NETWORK,
			standard: { code: 'bitcoin' },
			category: 'default',
			tags: TOKEN_TAGS,
			name: 'Bitcoin',
			symbol: 'BTC',
			decimals: 8
		};

		const ethToken: Token = {
			id: parseTokenId('ETH'),
			network: ETHEREUM_NETWORK,
			standard: { code: 'ethereum' },
			category: 'default',
			tags: TOKEN_TAGS,
			name: 'Ether',
			symbol: 'ETH',
			decimals: 18
		};

		const icrcToken: Token = {
			id: parseTokenId('ckBTC'),
			network: ICP_NETWORK,
			standard: { code: 'icrc' },
			category: 'default',
			name: 'ckBTC',
			symbol: 'ckBTC',
			decimals: 8,
			...({ ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai' } as object)
		} as Token;

		const solToken: Token = {
			id: parseTokenId('SOL'),
			network: SOLANA_MAINNET_NETWORK,
			standard: { code: 'solana' },
			category: 'default',
			tags: TOKEN_TAGS,
			name: 'Solana',
			symbol: 'SOL',
			decimals: 9
		};

		const userAddresses = {
			btc: 'bc1quserbtc',
			eth: '0xUserEth',
			icp: 'user-principal',
			sol: 'UserSolAddress'
		};

		const nativeSymbolByNetworkId = (id: typeof ETHEREUM_NETWORK.id) =>
			id === ETHEREUM_NETWORK.id ? 'ETH' : undefined;

		const btcTx: BtcTransactionUi = {
			id: 'btc-tx-1',
			type: 'send',
			status: 'confirmed',
			value: 100_000n,
			fee: 500n,
			from: 'bc1quserbtc',
			to: ['bc1qrecipient'],
			timestamp: TIMESTAMP_NS,
			txExplorerUrl: 'https://blockstream.info/tx/btc-tx-1'
		};

		const ethTx: EthTransactionUi = {
			id: '0xeth-tx-1',
			hash: '0xeth-tx-1',
			type: 'send',
			from: '0xUserEth',
			to: '0xRecipient',
			value: 1_000_000_000_000_000_000n,
			gasLimit: 21000n,
			gasUsed: 21000n,
			gasPrice: 50_000_000_000n,
			blockNumber: 12345,
			timestamp: TIMESTAMP_S,
			nonce: 0,
			data: '0x',
			chainId: 1n
		};

		const icTx: IcTransactionUi = {
			id: '42',
			type: 'receive',
			status: 'executed',
			value: 50_000_000n,
			fee: 10n,
			from: 'someone-principal',
			to: 'user-principal',
			incoming: true,
			timestamp: TIMESTAMP_NS,
			txExplorerUrl: 'https://dashboard.internetcomputer.org/tx/42'
		};

		const solTx: SolTransactionUi = {
			id: 'sol-tx-1',
			signature: signature(
				'5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW'
			),
			type: 'send',
			status: 'confirmed',
			value: 2_000_000_000n,
			fee: 5_000n,
			from: 'someAta',
			to: 'recipientAta',
			fromOwner: 'UserSolAddress',
			toOwner: 'RecipientOwner',
			// Solana stores blockTime in seconds (cast to bigint), not nanoseconds — this is
			// exactly the shape that previously rendered as 1970 because the formatter
			// hard-coded the ns assumption.
			timestamp: BigInt(TIMESTAMP_S),
			txExplorerUrl: 'https://solscan.io/tx/sol-tx-1'
		};

		it('renders a Bitcoin send with all 20 columns populated', () => {
			const transactions: AllTransactionUiWithCmp[] = [
				{ component: 'bitcoin', transaction: btcTx, token: btcToken }
			];

			const [row] = buildTransactionRows({
				transactions,
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			// Computed at test time so the assertion holds regardless of the host timezone —
			// the helper renders the date in whatever timezone the test environment is in.
			const expectedTimestampLocal = (() => {
				const d = new Date(TIMESTAMP_S * 1000);
				const pad = (n: number): string => String(n).padStart(2, '0');
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
			})();

			expect(row).toEqual({
				timestamp_iso: TIMESTAMP_ISO,
				timestamp_local: expectedTimestampLocal,
				network: BTC_MAINNET_NETWORK.name,
				token_symbol: 'BTC',
				token_address_or_ledger_id: '',
				type: 'send',
				type_display: 'Send',
				type_raw: 'send',
				direction: 'out',
				status: 'confirmed',
				from: 'bc1quserbtc',
				to: 'bc1qrecipient',
				// No contact match (empty contacts list) — falls back to the raw to-address
				// for an outgoing row.
				counterparty: 'bc1qrecipient',
				amount: '0.001',
				fee: '0.000005',
				fee_token: 'BTC',
				// On a same-token merge the Basic export's Fee column is empty, so the
				// Basic Fee Token reads empty too — that's what fee_token_display surfaces.
				fee_token_display: '',
				// Fee and asset share the BTC token symbol, so the signed fee is folded into
				// effective_token and effective_fee_token is left blank.
				effective_token: '-0.001005',
				effective_fee_token: '',
				tx_id: 'btc-tx-1',
				explorer_url: 'https://blockstream.info/tx/btc-tx-1',
				exported_at: exportedAtIso
			});
		});

		it('joins multiple BTC recipients with a semicolon', () => {
			const tx: BtcTransactionUi = { ...btcTx, type: 'receive', to: ['a', 'b', 'c'] };
			const [row] = buildTransactionRows({
				transactions: [{ component: 'bitcoin', transaction: tx, token: btcToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.to).toBe('a;b;c');
			expect(row.direction).toBe('in');
		});

		it('renders an Ethereum send with gas fee in ETH (18 decimals) and confirmed status', () => {
			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: ethTx, token: ethToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.network).toBe(ETHEREUM_NETWORK.name);
			expect(row.amount).toBe('1.0');
			// gasUsed * gasPrice = 21000 * 50e9 = 1.05e15 wei = 0.00105 ETH
			expect(row.fee).toBe('0.00105');
			expect(row.fee_token).toBe('ETH');
			expect(row.status).toBe('confirmed');
			expect(row.direction).toBe('out');
			expect(row.tx_id).toBe('0xeth-tx-1');
		});

		it('marks an ETH transaction with no blockNumber and a pendingTimestamp as pending', () => {
			const tx: EthTransactionUi = {
				...ethTx,
				blockNumber: undefined,
				pendingTimestamp: TIMESTAMP_S
			};
			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: tx, token: ethToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.status).toBe('pending');
		});

		it('leaves EVM fee_token blank when the network has no native symbol mapping', () => {
			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: ethTx, token: ethToken }],
				userAddresses,
				nativeSymbolByNetworkId: () => undefined,
				contacts: [],
				exportedAt
			});

			expect(row.fee_token).toBe('');
		});

		it('renders an IC receive using the incoming flag for direction and ledger id for the token address', () => {
			const [row] = buildTransactionRows({
				transactions: [{ component: 'ic', transaction: icTx, token: icrcToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.network).toBe(ICP_NETWORK.name);
			expect(row.token_symbol).toBe('ckBTC');
			expect(row.token_address_or_ledger_id).toBe('mxzaz-hqaaa-aaaar-qaada-cai');
			expect(row.direction).toBe('in');
			expect(row.amount).toBe('0.5');
			// Sender paid the fee — blank on incoming rows.
			expect(row.fee).toBe('');
			expect(row.fee_token).toBe('');
			expect(row.status).toBe('executed');
			expect(row.tx_id).toBe('42');
		});

		it('blanks fee and fee_token on incoming rows but keeps them on outgoing rows', () => {
			const outgoingIcTx: IcTransactionUi = {
				...icTx,
				type: 'send',
				incoming: false
			};

			const rows = buildTransactionRows({
				transactions: [
					{ component: 'ic', transaction: icTx, token: icrcToken },
					{ component: 'ic', transaction: outgoingIcTx, token: icrcToken }
				],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(rows[0].direction).toBe('in');
			expect(rows[0].fee).toBe('');
			expect(rows[0].fee_token).toBe('');
			// Fee + asset share ckBTC, so the columns merge: effective_token carries the
			// received amount and effective_fee_token stays blank.
			expect(rows[0].effective_token).toBe('0.5');
			expect(rows[0].effective_fee_token).toBe('');

			expect(rows[1].direction).toBe('out');
			expect(rows[1].fee).toBe('0.0000001');
			expect(rows[1].fee_token).toBe('ckBTC');
			// Merged: -amount + -fee = -0.5000001.
			expect(rows[1].effective_token).toBe('-0.5000001');
			expect(rows[1].effective_fee_token).toBe('');
		});

		it('treats a self-transfer as zero asset change but still records the fee', () => {
			// from === to: the user is sending to their own address. Net asset change is 0,
			// but the fee was still paid.
			const selfIcTx: IcTransactionUi = {
				...icTx,
				type: 'send',
				from: 'user-principal',
				to: 'user-principal',
				incoming: false
			};

			const [row] = buildTransactionRows({
				transactions: [{ component: 'ic', transaction: selfIcTx, token: icrcToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.direction).toBe('out');
			expect(row.amount).toBe('0.5');
			// Fee is kept (the user paid it on a self-transfer). Merged into effective_token
			// because fee shares the ckBTC token symbol: 0 + (-0.0000001) = -0.0000001.
			expect(row.fee).toBe('0.0000001');
			expect(row.fee_token).toBe('ckBTC');
			expect(row.effective_token).toBe('-0.0000001');
			expect(row.effective_fee_token).toBe('');
		});

		it('keeps the fee only on the outgoing duplicate of an ICRC self-transfer', () => {
			// ICRC indexers emit self-transfers twice — once as send, once as receive. Only the
			// outgoing duplicate should carry the fee so the spreadsheet sum stays honest.
			const outSelf: IcTransactionUi = {
				...icTx,
				type: 'send',
				from: 'user-principal',
				to: 'user-principal',
				incoming: false
			};
			const inSelf: IcTransactionUi = {
				...icTx,
				type: 'receive',
				from: 'user-principal',
				to: 'user-principal',
				incoming: true
			};

			const rows = buildTransactionRows({
				transactions: [
					{ component: 'ic', transaction: outSelf, token: icrcToken },
					{ component: 'ic', transaction: inSelf, token: icrcToken }
				],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(rows[0].direction).toBe('out');
			expect(rows[0].fee).toBe('0.0000001');
			expect(rows[0].effective_token).toBe('-0.0000001');

			expect(rows[1].direction).toBe('in');
			expect(rows[1].fee).toBe('');
			expect(rows[1].fee_token).toBe('');
			// Sum of effective_token across both duplicates is the fee, charged once.
			expect(rows[1].effective_token).toBe('0');
			expect(rows[1].effective_fee_token).toBe('');
		});

		it('zeros effective_token on approve rows but still records the fee', () => {
			// Same-token approve (ICRC): fee folds into effective_token. amount is descriptive
			// (the approved allowance), not a balance movement.
			const sameTokenApprove: IcTransactionUi = {
				...icTx,
				type: 'approve',
				from: 'user-principal',
				to: 'spender-principal',
				incoming: false
			};

			const [row] = buildTransactionRows({
				transactions: [{ component: 'ic', transaction: sameTokenApprove, token: icrcToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.type).toBe('approve');
			expect(row.amount).toBe('0.5');
			expect(row.fee).toBe('0.0000001');
			// Asset contribution is 0 (approve doesn't move balance) + fee folded in.
			expect(row.effective_token).toBe('-0.0000001');
			expect(row.effective_fee_token).toBe('');
		});

		it('zeros effective_token but populates effective_fee_token for an approve with a different fee token', () => {
			// EVM approve: ERC20 token + gas fee in the chain's native token. Columns don't merge.
			const evmApprove: EthTransactionUi = {
				...ethTx,
				type: 'approve',
				from: '0xUserEth',
				to: '0xUSDCContract'
			};
			const erc20Token: Token = {
				...ethToken,
				standard: { code: 'erc20' },
				name: 'USD Coin',
				symbol: 'USDC',
				decimals: 6,
				...({ address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' } as object)
			} as Token;

			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: evmApprove, token: erc20Token }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.type).toBe('approve');
			expect(row.token_symbol).toBe('USDC');
			expect(row.fee_token).toBe('ETH');
			// fee_token_display keeps the gas token since the Basic Fee column has a value
			// to label — only the same-token merge clears it.
			expect(row.fee_token_display).toBe('ETH');
			// Asset (USDC) is unchanged by an approve.
			expect(row.effective_token).toBe('0');
			// Fee is in ETH, kept in its own column.
			expect(row.effective_fee_token).toBe('-0.00105');
		});

		it('leaves the Fee column empty (not "0") on an incoming row with a different fee token', () => {
			// Receiving an ERC20 like USDC: the sender paid the gas in ETH, so the user
			// neither paid the asset fee nor the gas fee. The Basic Fee column must read empty,
			// not "0", to make this unambiguous in spreadsheets.
			const inboundUsdc: EthTransactionUi = {
				...ethTx,
				type: 'receive',
				from: '0xSomeoneElse',
				to: '0xUserEth'
			};
			const erc20Token: Token = {
				...ethToken,
				standard: { code: 'erc20' },
				name: 'USD Coin',
				symbol: 'USDC',
				decimals: 6,
				...({ address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' } as object)
			} as Token;

			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: inboundUsdc, token: erc20Token }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.direction).toBe('in');
			expect(row.fee).toBe('');
			expect(row.fee_token).toBe('');
			expect(row.fee_token_display).toBe('');
			expect(row.effective_fee_token).toBe('');
		});

		it('renders a Solana send with fee in SOL (9 decimals) and direction from owner addresses', () => {
			const [row] = buildTransactionRows({
				transactions: [{ component: 'solana', transaction: solTx, token: solToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.network).toBe(SOLANA_MAINNET_NETWORK.name);
			expect(row.amount).toBe('2.0');
			expect(row.fee).toBe('0.000005');
			expect(row.fee_token).toBe('SOL');
			expect(row.direction).toBe('out');
			expect(row.from).toBe('UserSolAddress');
			expect(row.to).toBe('RecipientOwner');
			// Regression: SOL timestamps are seconds-as-bigint. The formatter must detect that
			// by magnitude rather than blindly dividing every bigint by 1e9, otherwise this row
			// would render as 1970-01-01.
			expect(row.timestamp_iso).toBe(TIMESTAMP_ISO);
			expect(row.tx_id).toMatch(/^[A-HJ-NP-Za-km-z1-9]{87,88}$/);
		});

		it('maps the ck-minter withdraw raw type to receive (user is receiving back)', () => {
			// `withdraw` in eth/utils/transactions.utils.ts means the ck-minter is sending funds
			// to the user — incoming for the user despite the banking-style verb.
			const withdraw: EthTransactionUi = { ...ethTx, type: 'withdraw', from: '0xMinter' };
			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: withdraw, token: ethToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.type).toBe('receive');
			expect(row.type_raw).toBe('withdraw');
			expect(row.direction).toBe('in');
		});

		it('maps the ck-minter deposit raw type to send (user is sending in)', () => {
			// `deposit` in eth/utils/transactions.utils.ts means the user is sending funds to
			// the ck-minter to mint a wrapped asset — outgoing for the user.
			const deposit: EthTransactionUi = { ...ethTx, type: 'deposit', to: '0xMinter' };
			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: deposit, token: ethToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.type).toBe('send');
			expect(row.type_raw).toBe('deposit');
			expect(row.direction).toBe('out');
		});

		it('falls back to "other" for unknown types', () => {
			const tx: EthTransactionUi = { ...ethTx, type: 'pending' as EthTransactionUi['type'] };
			const [row] = buildTransactionRows({
				transactions: [{ component: 'ethereum', transaction: tx, token: ethToken }],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(row.type).toBe('other');
		});

		describe('counterparty resolution', () => {
			const aliceContact: ContactUi = {
				id: BigInt(1),
				name: 'Alice',
				updateTimestampNs: ZERO,
				addresses: [{ address: 'bc1qrecipient', addressType: 'Btc', label: 'Hardware Wallet' }]
			};

			const bobContact: ContactUi = {
				id: BigInt(2),
				name: 'Bob',
				updateTimestampNs: ZERO,
				addresses: [{ address: 'recipient-principal', addressType: 'Icrcv2' }]
			};

			it('renders the contact name with the address label on an outgoing match', () => {
				const [row] = buildTransactionRows({
					transactions: [{ component: 'bitcoin', transaction: btcTx, token: btcToken }],
					userAddresses,
					nativeSymbolByNetworkId,
					contacts: [aliceContact],
					exportedAt
				});

				expect(row.direction).toBe('out');
				expect(row.to).toBe('bc1qrecipient');
				expect(row.counterparty).toBe('Alice (Hardware Wallet)');
			});

			it('renders just the contact name when no address label is set (incoming)', () => {
				const outgoingIcTx: IcTransactionUi = {
					...icTx,
					type: 'receive',
					from: 'recipient-principal',
					to: 'user-principal',
					incoming: true
				};

				const [row] = buildTransactionRows({
					transactions: [{ component: 'ic', transaction: outgoingIcTx, token: icrcToken }],
					userAddresses,
					nativeSymbolByNetworkId,
					contacts: [bobContact],
					exportedAt
				});

				expect(row.direction).toBe('in');
				expect(row.from).toBe('recipient-principal');
				expect(row.counterparty).toBe('Bob');
			});

			it('falls back to the raw address when no contact matches', () => {
				const [row] = buildTransactionRows({
					transactions: [{ component: 'bitcoin', transaction: btcTx, token: btcToken }],
					userAddresses,
					nativeSymbolByNetworkId,
					contacts: [bobContact], // Bob's address is ICRC, won't match a BTC tx
					exportedAt
				});

				expect(row.counterparty).toBe('bc1qrecipient');
			});

			it('is empty when direction cannot be determined', () => {
				// IC transaction without incoming flag set → direction stays empty.
				const ambiguousIcTx: IcTransactionUi = { ...icTx, incoming: undefined };

				const [row] = buildTransactionRows({
					transactions: [{ component: 'ic', transaction: ambiguousIcTx, token: icrcToken }],
					userAddresses,
					nativeSymbolByNetworkId,
					contacts: [aliceContact, bobContact],
					exportedAt
				});

				expect(row.direction).toBe('');
				expect(row.counterparty).toBe('');
			});
		});

		it('writes the same exported_at on every row regardless of network', () => {
			const rows = buildTransactionRows({
				transactions: [
					{ component: 'bitcoin', transaction: btcTx, token: btcToken },
					{ component: 'ethereum', transaction: ethTx, token: ethToken },
					{ component: 'ic', transaction: icTx, token: icrcToken },
					{ component: 'solana', transaction: solTx, token: solToken }
				],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(rows.every(({ exported_at }) => exported_at === exportedAtIso)).toBeTruthy();
			expect(rows).toHaveLength(4);
		});

		it('returns an empty array for an empty input', () => {
			const rows = buildTransactionRows({
				transactions: [],
				userAddresses,
				nativeSymbolByNetworkId,
				contacts: [],
				exportedAt
			});

			expect(rows).toEqual([]);
		});
	});
});
