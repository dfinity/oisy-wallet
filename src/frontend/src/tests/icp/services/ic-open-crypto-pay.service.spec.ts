import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { calculateIcFee } from '$icp/services/ic-open-crypto-pay.services';
import type { PayableToken } from '$lib/types/open-crypto-pay';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';

describe('ic-open-crypto-pay.service', () => {
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
});
