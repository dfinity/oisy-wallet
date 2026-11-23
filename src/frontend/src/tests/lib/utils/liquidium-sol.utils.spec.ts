import { LiquidiumSolBlockhashExpiredError } from '$lib/types/errors';
import { liquidiumSolRefusalMessage } from '$lib/utils/liquidium-sol.utils';
import { mapSolanaErrorMsg } from '$sol/utils/sol-error.utils';
import en from '$tests/mocks/i18n.mock';

vi.mock(import('$sol/utils/sol-error.utils'), async (importOriginal) => ({
	...(await importOriginal()),
	mapSolanaErrorMsg: vi.fn()
}));

describe('liquidium-sol.utils', () => {
	describe('liquidiumSolRefusalMessage', () => {
		beforeEach(() => {
			vi.mocked(mapSolanaErrorMsg).mockReturnValue(undefined);
		});

		it('says the transaction expired when its blockhash was no longer valid', () => {
			expect(
				liquidiumSolRefusalMessage({
					cause: new LiquidiumSolBlockhashExpiredError(
						'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N'
					),
					i18n: en
				})
			).toBe(en.send.error.solana_transaction_expired);
		});

		it("uses the Solana error's translated message when there is one", () => {
			vi.mocked(mapSolanaErrorMsg).mockReturnValue(en.send.error.solana_insufficient_funds);

			expect(liquidiumSolRefusalMessage({ cause: new Error('preflight'), i18n: en })).toBe(
				en.send.error.solana_insufficient_funds
			);
		});

		it('falls back to the transaction failing', () => {
			expect(liquidiumSolRefusalMessage({ cause: new Error('signing failed'), i18n: en })).toBe(
				en.liquidium.text.transaction_failed
			);
		});
	});
});
