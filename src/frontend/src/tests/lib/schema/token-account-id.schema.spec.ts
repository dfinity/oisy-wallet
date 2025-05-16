import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import { Principal } from '@dfinity/principal';

describe('token-account-id.schema', () => {
	describe('TokenAccountIdSchema', () => {
		it('should validate Icrcv2 account addresses', () => {
			// Valid ICRC account address with principal and no subaccount
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const icrcAccount = `${principal.toText()}`;

			const result = TokenAccountIdSchema.safeParse(icrcAccount);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({
				Icrcv2: {
					WithPrincipal: {
						owner: principal,
						subaccount: []
					}
				}
			});
		});

		it('should validate Btc P2PKH addresses', () => {
			const p2pkhAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

			// const result = TokenAccountIdSchema.safeParse({ Btc: p2pkhAddress });
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
	});
});
