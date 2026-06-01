import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { PayableTokenWithFees } from '$lib/types/open-crypto-pay';
import { enrichSingleTokenPayableToken } from '$lib/utils/open-crypto-pay-enrich.utils';

describe('open-crypto-pay-enrich.utils', () => {
	describe('enrichSingleTokenPayableToken', () => {
		const exchangeRate = 50000;
		const feeAmount = 1000n;

		const token: PayableTokenWithFees = {
			...BTC_MAINNET_TOKEN,
			amount: '0.001',
			minFee: 0.00001,
			tokenNetwork: 'Bitcoin',
			fee: { feeSatoshis: feeAmount }
		} as PayableTokenWithFees;

		const exchanges: ExchangesData = {
			[BTC_MAINNET_TOKEN.id]: { usd: exchangeRate }
		};

		const sufficientBalance: CertifiedStoreData<BalancesData> = {
			[BTC_MAINNET_TOKEN.id]: { data: 100000000n, certified: true }
		};

		const getFee = (fee: PayableTokenWithFees['fee']): bigint | undefined =>
			(fee as { feeSatoshis: bigint } | undefined)?.feeSatoshis;

		it('should return undefined when getFee resolves to undefined', () => {
			expect(
				enrichSingleTokenPayableToken({
					token,
					exchanges,
					balances: sufficientBalance,
					getFee: () => undefined
				})
			).toBeUndefined();
		});

		it('should return undefined when exchange rate is nullish', () => {
			expect(
				enrichSingleTokenPayableToken({
					token,
					exchanges: {},
					balances: sufficientBalance,
					getFee
				})
			).toBeUndefined();
		});

		it('should return undefined when balance is insufficient', () => {
			expect(
				enrichSingleTokenPayableToken({
					token: { ...token, amount: '1' },
					exchanges,
					balances: { [BTC_MAINNET_TOKEN.id]: { data: 1000n, certified: true } },
					getFee
				})
			).toBeUndefined();
		});

		it('should treat missing balance as zero and return undefined', () => {
			expect(
				enrichSingleTokenPayableToken({
					token,
					exchanges,
					balances: {},
					getFee
				})
			).toBeUndefined();
		});

		it('should enrich the token with USD values resolved from the fee accessor', () => {
			const amount = Number(token.amount);
			const formattedFee = Number(feeAmount) / 10 ** BTC_MAINNET_TOKEN.decimals;
			const amountInUSD = amount * exchangeRate;
			const feeInUSD = formattedFee * exchangeRate;

			expect(
				enrichSingleTokenPayableToken({
					token,
					exchanges,
					balances: sufficientBalance,
					getFee
				})
			).toStrictEqual({
				...token,
				amountInUSD,
				feeInUSD,
				sumInUSD: amountInUSD + feeInUSD
			});
		});
	});
});
