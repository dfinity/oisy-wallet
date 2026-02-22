import { BtcPrepareSendError } from '$btc/types/btc-send';
import { enrichBtcPayableToken, validateBtcTransfer } from '$btc/utils/btc-open-crypto-pay.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';

describe('btc-open-crypto-pay.utils', () => {
	describe('enrichBtcPayableToken', () => {
		const mockExchangeRate = 50000;
		const mockBalance = 100000000n;

		const createMockToken = (overrides?: Partial<PayableTokenWithFees>): PayableTokenWithFees => ({
			...BTC_MAINNET_TOKEN,
			amount: '0.001',
			minFee: 0.00001,
			fee: mockUtxosFee,
			tokenNetwork: 'bitcoin',
			...overrides
		});

		const createMockExchanges = (rate?: number): ExchangesData => ({
			[BTC_MAINNET_TOKEN.id]: { usd: rate ?? mockExchangeRate }
		});

		const createMockBalances = (balance?: bigint): CertifiedStoreData<BalancesData> => ({
			[BTC_MAINNET_TOKEN.id]: { data: balance ?? mockBalance, certified: true }
		});

		it('should return undefined when fee is nullish', () => {
			const token = createMockToken({ fee: undefined });

			const result = enrichBtcPayableToken({
				token,
				exchanges: createMockExchanges(),
				balances: createMockBalances()
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when fee has error', () => {
			const token = createMockToken({
				fee: { ...mockUtxosFee, error: BtcPrepareSendError.InsufficientBalance }
			});

			const result = enrichBtcPayableToken({
				token,
				exchanges: createMockExchanges(),
				balances: createMockBalances()
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when exchange rate is nullish', () => {
			const token = createMockToken();

			const result = enrichBtcPayableToken({
				token,
				exchanges: {},
				balances: createMockBalances()
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when balance is nullish', () => {
			const token = createMockToken();

			const result = enrichBtcPayableToken({
				token,
				exchanges: createMockExchanges(),
				balances: {}
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when balance is insufficient', () => {
			const token = createMockToken({ amount: '1' });
			const insufficientBalance = 1000n;

			const result = enrichBtcPayableToken({
				token,
				exchanges: createMockExchanges(),
				balances: createMockBalances(insufficientBalance)
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when balance equals zero', () => {
			const token = createMockToken();

			const result = enrichBtcPayableToken({
				token,
				exchanges: createMockExchanges(),
				balances: createMockBalances(ZERO)
			});

			expect(result).toBeUndefined();
		});

		it('should return enriched token with correct USD values', () => {
			const amount = 0.001;
			const token = createMockToken({ amount: `${amount}` });

			const result = enrichBtcPayableToken({
				token,
				exchanges: createMockExchanges(),
				balances: createMockBalances()
			});

			expect(result?.amountInUSD).toBe(amount * mockExchangeRate);
			expect(result?.feeInUSD).toBe(0.5);
			expect(result?.sumInUSD).toBe((result?.amountInUSD ?? 0) + (result?.feeInUSD ?? 0));
		});
	});

	describe('validateBtcTransfer', () => {
		const mockAmount = 100000n;

		const createMockToken = (
			overrides?: Partial<PayableTokenWithConvertedAmount>
		): PayableTokenWithConvertedAmount => ({
			...BTC_MAINNET_TOKEN,
			amount: '0.001',
			minFee: 0.00001,
			fee: mockUtxosFee,
			amountInUSD: 50,
			feeInUSD: 0.5,
			sumInUSD: 50.5,
			tokenNetwork: 'bitcoin',
			...overrides
		});

		const createMockDecodedData = (overrides?: Partial<DecodedUrn>): DecodedUrn => ({
			destination: mockBtcAddress,
			amount: 0.001,
			prefix: 'bitcoin',
			...overrides
		});

		it('should throw error when token is not Bitcoin token', () => {
			const token = createMockToken({
				...ETHEREUM_TOKEN
			});

			expect(() =>
				validateBtcTransfer({
					decodedData: createMockDecodedData(),
					amount: mockAmount,
					token
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw error when fee is undefined', () => {
			const token = createMockToken({ fee: undefined });

			expect(() =>
				validateBtcTransfer({
					decodedData: createMockDecodedData(),
					amount: mockAmount,
					token
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw error when fee has error', () => {
			const token = createMockToken({
				fee: { ...mockUtxosFee, error: BtcPrepareSendError.InsufficientBalance }
			});

			expect(() =>
				validateBtcTransfer({
					decodedData: createMockDecodedData(),
					amount: mockAmount,
					token
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw error when destination is undefined', () => {
			const token = createMockToken();

			expect(() =>
				validateBtcTransfer({
					decodedData: createMockDecodedData({ destination: undefined }),
					amount: mockAmount,
					token
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw error when amount param is undefined', () => {
			const token = createMockToken();

			expect(() =>
				validateBtcTransfer({
					decodedData: createMockDecodedData({ amount: undefined }),
					amount: mockAmount,
					token
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw error when destination is not a valid BTC address', () => {
			const token = createMockToken();

			expect(() =>
				validateBtcTransfer({
					decodedData: createMockDecodedData({ destination: 'invalid-address' }),
					amount: mockAmount,
					token
				})
			).toThrowError(en.pay.error.recipient_address_is_not_valid);
		});

		it('should throw error when amounts do not match', () => {
			const token = createMockToken();
			const differentAmount = 200000n;

			expect(() =>
				validateBtcTransfer({
					decodedData: createMockDecodedData({ amount: 0.001 }),
					amount: differentAmount,
					token
				})
			).toThrowError(en.pay.error.amount_does_not_match);
		});

		it('should return validated data when all conditions are met', () => {
			const token = createMockToken();

			const result = validateBtcTransfer({
				decodedData: createMockDecodedData(),
				amount: mockAmount,
				token
			});

			expect(result).toEqual({
				destination: mockBtcAddress,
				satoshisAmount: mockAmount,
				utxosFee: {
					utxos: mockUtxosFee.utxos,
					feeSatoshis: mockUtxosFee.feeSatoshis
				}
			});
		});
	});
});
