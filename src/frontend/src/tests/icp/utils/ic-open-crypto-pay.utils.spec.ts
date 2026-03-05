import { getIcPaymentUri } from '$icp/utils/ic-open-crypto-pay.utils';
import { mockPrincipalText } from '$tests/mocks/identity.mock';

describe('ic-open-crypto-pay.utils', () => {
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
