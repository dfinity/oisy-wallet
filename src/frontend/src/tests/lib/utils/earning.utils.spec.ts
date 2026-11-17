import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { ZERO } from '$lib/constants/app.constants';
import type { TokenUi } from '$lib/types/token-ui';
import { heldTopRateApy } from '$lib/utils/earning.utils';

describe('earning.utils', () => {
	describe('heldTopRateApy', () => {
		const held = ({
			token,
			balance
		}: {
			token: typeof USDT_TOKEN;
			balance: bigint | null;
		}): TokenUi => ({
			...token,
			balance
		});

		const apyByTokenId = new Map([
			[USDT_TOKEN.id, 6.47],
			[USDC_TOKEN.id, 5.75]
		]);

		it('returns the best rate among the tokens the user holds', () => {
			expect(
				heldTopRateApy({
					tokens: [
						held({ token: USDC_TOKEN, balance: 1_000_000n }),
						held({ token: USDT_TOKEN, balance: 1_000_000n })
					],
					apyByTokenId
				})
			).toBe(6.47);
		});

		it('leaves out the tokens the user holds none of', () => {
			expect(
				heldTopRateApy({
					tokens: [
						held({ token: USDC_TOKEN, balance: 1_000_000n }),
						held({ token: USDT_TOKEN, balance: ZERO })
					],
					apyByTokenId
				})
			).toBe(5.75);

			expect(
				heldTopRateApy({ tokens: [held({ token: USDT_TOKEN, balance: null })], apyByTokenId })
			).toBeUndefined();
		});

		it('returns undefined when no held token has a top rate', () => {
			expect(
				heldTopRateApy({
					tokens: [held({ token: USDT_TOKEN, balance: 1_000_000n })],
					apyByTokenId: new Map()
				})
			).toBeUndefined();
		});
	});
});
