import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';

describe('token-account-id.schema', () => {
	describe('TokenAccountIdSchema', () => {
		it('should validate Btc P2PKH addresses', () => {
			const p2pkhAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

			const result = TokenAccountIdSchema.safeParse(p2pkhAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ Btc: { P2PKH: p2pkhAddress } });
		});

		it('should validate Eth addresses', () => {
			const ethAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

			const result = TokenAccountIdSchema.safeParse(ethAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ Eth: { Public: ethAddress } });
		});

		it('should validate Sol addresses', () => {
			const solAddress = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1TuAeJvzNg9pRcRGD';

			const result = TokenAccountIdSchema.safeParse(solAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ Sol: solAddress });
		});

		it('should validate Xrp classic addresses', () => {
			const xrpAddress = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';

			const result = TokenAccountIdSchema.safeParse(xrpAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ Xrp: xrpAddress });
		});

		it('should reject an Xrp address with an invalid checksum', () => {
			// The address above with its last character changed
			expect(
				TokenAccountIdSchema.safeParse('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTi').success
			).toBeFalsy();
		});

		it('should reject Xrp X-addresses', () => {
			// The address above encoded as an X-address, which the backend does not accept either
			expect(
				TokenAccountIdSchema.safeParse('XVPcpSm47b1CZkf5AkKM9a84dQHe3m4sBhsrA4XtnBECTAc').success
			).toBeFalsy();
		});
	});
});
