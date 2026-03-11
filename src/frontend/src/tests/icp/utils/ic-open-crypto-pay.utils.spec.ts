import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcFeeResult } from '$icp/types/pay';
import {
	enrichIcPayableToken,
	getIcPaymentUri,
	validateIcTransfer
} from '$icp/utils/ic-open-crypto-pay.utils';
import { ZERO } from '$lib/constants/app.constants';
import type {
	PayableTokenWithConvertedAmount,
	ValidatedIcPaymentData
} from '$lib/types/open-crypto-pay';
import type { DecodedUrn } from '$lib/types/qr-code';
import { formatToken } from '$lib/utils/format.utils';
import { parseToken } from '$lib/utils/parse.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidDip20Token } from '$tests/mocks/ic-tokens.mock';
import { mockPrincipal2, mockPrincipalText, mockPrincipalText2 } from '$tests/mocks/identity.mock';

describe('ic-open-crypto-pay.utils', () => {
	const mockFee: IcFeeResult = {
		feePerTransaction: ICP_TOKEN.fee,
		totalFee: ICP_TOKEN.fee * 2n
	};

	const mockToken = {
		...ICP_TOKEN,
		tokenNetwork: 'InternetComputer',
		amount: '0.001',
		minFee: 0.0001,
		amountInUSD: 50,
		feeInUSD: 0.5,
		sumInUSD: 50.5,
		fee: mockFee
	} as PayableTokenWithConvertedAmount;

	const mockExchangeRate = 123;

	const mockAmountToPay = parseToken({
		value: mockToken.amount,
		unitName: mockToken.decimals
	});

	const mockFeeInUsd = Number(
		formatToken({
			value: mockFee.totalFee,
			unitName: mockToken.decimals,
			displayDecimals: mockToken.decimals
		})
	);

	const mockNeededBalance = mockAmountToPay + mockFee.totalFee;

	const expected: PayableTokenWithConvertedAmount = {
		...mockToken,
		amountInUSD: Number(mockToken.amount) * mockExchangeRate,
		feeInUSD: mockFeeInUsd * mockExchangeRate,
		sumInUSD: (Number(mockToken.amount) + mockFeeInUsd) * mockExchangeRate
	};

	describe('enrichIcPayableToken', () => {
		const params = {
			token: mockToken,
			exchanges: { [mockToken.id]: { usd: mockExchangeRate } },
			balances: { [mockToken.id]: { data: mockNeededBalance, certified: false } }
		};

		it('should return undefined if fee is not IC-related', () => {
			expect(
				enrichIcPayableToken({
					...params,
					token: {
						...mockToken,
						fee: {
							feeInWei: 300000n,
							feeData: {
								maxFeePerGas: 12n,
								maxPriorityFeePerGas: 7n
							},
							estimatedGasLimit: 25000n
						}
					} as PayableTokenWithConvertedAmount
				})
			).toBeUndefined();
		});

		it('should return undefined if exchange rate is nullish', () => {
			expect(
				enrichIcPayableToken({
					...params,
					exchanges: {}
				})
			).toBeUndefined();
		});

		it('should return undefined if balance is nullish', () => {
			expect(
				enrichIcPayableToken({
					...params,
					balances: undefined
				})
			).toBeUndefined();

			expect(
				enrichIcPayableToken({
					...params,
					balances: {}
				})
			).toBeUndefined();

			expect(
				enrichIcPayableToken({
					...params,
					balances: { [mockToken.id]: null }
				})
			).toBeUndefined();
		});

		it('should return undefined if balance is insufficient', () => {
			expect(
				enrichIcPayableToken({
					...params,
					balances: { [mockToken.id]: { data: mockAmountToPay - 1n, certified: false } }
				})
			).toBeUndefined();
		});

		it('should return undefined if balance equals zero', () => {
			expect(
				enrichIcPayableToken({
					...params,
					balances: { [mockToken.id]: { data: ZERO, certified: false } }
				})
			).toBeUndefined();
		});

		it('should return enriched token with correct USD values', () => {
			expect(enrichIcPayableToken(params)).toStrictEqual(expected);

			expect(
				enrichIcPayableToken({
					...params,
					balances: { [mockToken.id]: { data: mockNeededBalance * 2n, certified: false } }
				})
			).toStrictEqual(expected);
		});
	});

	describe('validateIcTransfer', () => {
		const mockDecodedData: DecodedUrn = {
			prefix: 'ic',
			destination: mockPrincipalText2,
			amount: 123_456_789
		};

		const params = {
			decodedData: mockDecodedData,
			token: mockToken,
			amount: 123_456_789n * 10n ** BigInt(ICP_TOKEN.decimals)
		};

		const expected: ValidatedIcPaymentData = {
			spender: mockPrincipal2,
			amount: 123_456_789n * 10n ** BigInt(ICP_TOKEN.decimals),
			ledgerCanisterId: ICP_TOKEN.ledgerCanisterId,
			fee: mockFee
		};

		it('should validate transfer successfully', () => {
			expect(validateIcTransfer(params)).toEqual(expected);
		});

		it('should throw if the token is not an IC payable token', () => {
			expect(() =>
				validateIcTransfer({
					...params,
					token: {
						...mockToken,
						...mockValidDip20Token,
						fee: mockFee
					} as PayableTokenWithConvertedAmount
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw if destination is missing', () => {
			expect(() =>
				validateIcTransfer({
					...params,
					decodedData: {
						...mockDecodedData,
						// @ts-expect-error we test this on purpose
						destination: undefined
					}
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw if amount is missing', () => {
			expect(() =>
				validateIcTransfer({
					...params,
					decodedData: {
						...mockDecodedData,
						amount: undefined
					}
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw if fee is missing', () => {
			expect(() =>
				validateIcTransfer({
					...params,
					token: {
						...mockToken,
						fee: undefined
					} as PayableTokenWithConvertedAmount
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw if fee is not IC-related', () => {
			expect(() =>
				validateIcTransfer({
					...params,
					token: {
						...mockToken,
						fee: {
							feeInWei: 300000n,
							feeData: {
								maxFeePerGas: 12n,
								maxPriorityFeePerGas: 7n
							},
							estimatedGasLimit: 25000n
						}
					} as PayableTokenWithConvertedAmount
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw if destination is invalid', () => {
			expect(() =>
				validateIcTransfer({
					...params,
					decodedData: {
						...mockDecodedData,
						destination: 'invalid_principal'
					}
				})
			).toThrowError(en.pay.error.data_is_incompleted);
		});

		it('should throw if amount does not match', () => {
			expect(() =>
				validateIcTransfer({
					...params,
					amount: 987_654_321n
				})
			).toThrowError(en.pay.error.amount_does_not_match);
		});
	});

	describe('getIcPaymentUri', () => {
		it('should construct payment URI with cb replaced by tx', () => {
			const result = getIcPaymentUri({
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123',
				quoteId: 'quote123',
				network: 'InternetComputer',
				asset: 'ICP',
				sender: mockPrincipalText
			});

			expect(result).toBe(
				`https://api.dfx.swiss/v1/lnurlp/tx/pl_test123?quote=quote123&method=InternetComputer&asset=ICP&sender=${mockPrincipalText}`
			);
		});

		it('should replace only cb with tx in callback URL', () => {
			const result = getIcPaymentUri({
				callback: 'https://api.test.com/cb/callback/cb',
				quoteId: 'q1',
				network: 'InternetComputer',
				asset: 'ICP',
				sender: mockPrincipalText
			});

			expect(result).toBe(
				`https://api.test.com/tx/callback/cb?quote=q1&method=InternetComputer&asset=ICP&sender=${mockPrincipalText}`
			);
		});
	});
});
