import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { approve } from '$icp/api/icrc-ledger.api';
import { calculateIcFee, payIcp } from '$icp/services/ic-open-crypto-pay.services';
import type { IcFeeResult } from '$icp/types/pay';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type {
	PayableToken,
	PayableTokenWithConvertedAmount,
	ValidatedIcPaymentData
} from '$lib/types/open-crypto-pay';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal2 } from '$tests/mocks/identity.mock';

vi.mock('$lib/rest/open-crypto-pay.rest', () => ({
	fetchOpenCryptoPay: vi.fn()
}));

vi.mock('$icp/api/icrc-ledger.api', () => ({
	approve: vi.fn()
}));

describe('ic-open-crypto-pay.services', () => {
	describe('calculateIcFee', () => {
		it('should return correct fee for a valid ICP token', () => {
			const mockToken: PayableToken = {
				...ICP_TOKEN,
				amount: '1.0',
				tokenNetwork: 'InternetComputer'
			} as PayableToken;

			expect(calculateIcFee(mockToken)).toEqual({
				feePerTransaction: ICP_TOKEN.fee,
				totalFee: ICP_TOKEN.fee * 2n
			});
		});

		it('should return correct fee for a valid ICRC token', () => {
			const mockToken: PayableToken = {
				...mockValidIcrcToken,
				amount: '1.0',
				tokenNetwork: 'InternetComputer'
			} as PayableToken;

			expect(calculateIcFee(mockToken)).toEqual({
				feePerTransaction: mockValidIcrcToken.fee,
				totalFee: mockValidIcrcToken.fee * 2n
			});
		});

		it('should return undefined for non-IC tokens', () => {
			const mockToken: PayableToken = {
				...USDC_TOKEN,
				amount: '1.0',
				tokenNetwork: 'Solana'
			} as PayableToken;

			expect(calculateIcFee(mockToken)).toBeUndefined();
		});
	});

	describe('payIcp', () => {
		const mockProgress = vi.fn();

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

		const mockValidatedData: ValidatedIcPaymentData = {
			spender: mockPrincipal2,
			amount: 123n,
			ledgerCanisterId: ICP_TOKEN.ledgerCanisterId,
			fee: mockFee
		};

		const baseParams = {
			token: mockToken,
			identity: mockIdentity,
			validatedData: mockValidatedData,
			progress: mockProgress,
			quoteId: 'test-quote-id',
			callback: 'https://api.dfx.swiss/v1/lnurlp/cb/test-callback'
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call approve with correct parameters', async () => {
			await payIcp(baseParams);

			expect(approve).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: mockValidatedData.ledgerCanisterId,
				amount: mockValidatedData.amount + mockValidatedData.fee.feePerTransaction,
				spender: { owner: mockPrincipal2 },
				expiresAt: expect.any(BigInt)
			});
		});

		it('should call progress with PAY step after signing', async () => {
			await payIcp(baseParams);

			expect(mockProgress).toHaveBeenCalledExactlyOnceWith(ProgressStepsPayment.PAY);
		});

		it('should call fetchOpenCryptoPay with correct payment URI', async () => {
			const expectedUri = `https://api.dfx.swiss/v1/lnurlp/tx/test-callback?quote=test-quote-id&method=InternetComputer&asset=ICP&sender=${mockIdentity.getPrincipal().toText()}`;

			await payIcp(baseParams);

			expect(fetchOpenCryptoPay).toHaveBeenCalledExactlyOnceWith(expectedUri);
		});

		it('should propagate errors from approve', async () => {
			vi.mocked(approve).mockRejectedValueOnce(new Error('Approve failed'));

			await expect(payIcp(baseParams)).rejects.toThrowError('Approve failed');
		});

		it('should propagate errors from fetchOpenCryptoPay', async () => {
			vi.mocked(fetchOpenCryptoPay).mockRejectedValueOnce(new Error('Payment API failed'));

			await expect(payIcp(baseParams)).rejects.toThrowError('Payment API failed');
		});
	});
});
