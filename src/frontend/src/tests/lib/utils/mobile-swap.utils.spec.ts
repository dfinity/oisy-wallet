import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SwapProvider } from '$lib/types/swap';
import { isMobileSwapPair, isMobileSwapProvider } from '$lib/utils/mobile-swap.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';

const ckBtc = { ...mockValidIcrcToken, network: ICP_TOKEN.network };

describe('mobile-swap.utils', () => {
	describe('isMobileSwapPair', () => {
		it('accepts canonical ICP/ck-token pairs in both directions', () => {
			expect(isMobileSwapPair({ sourceToken: ICP_TOKEN, destinationToken: ckBtc })).toBeTruthy();
			expect(isMobileSwapPair({ sourceToken: ckBtc, destinationToken: ICP_TOKEN })).toBeTruthy();
		});

		it.each([
			undefined,
			ETHEREUM_TOKEN,
			ICP_TOKEN,
			{ ...ICP_TOKEN, id: parseTokenId('ICP') },
			{ ...ckBtc, ledgerCanisterId: 'aaaaa-aa', symbol: 'ckBTC' }
		])(
			'rejects missing, cross-chain, identical-ledger and custom destinations',
			(destinationToken) => {
				expect(isMobileSwapPair({ sourceToken: ICP_TOKEN, destinationToken })).toBeFalsy();
			}
		);

		it('rejects an unsupported source', () => {
			expect(
				isMobileSwapPair({ sourceToken: ETHEREUM_TOKEN, destinationToken: ckBtc })
			).toBeFalsy();
		});
	});

	describe('isMobileSwapProvider', () => {
		it.each(Object.values(SwapProvider))('only permits ICPSwap quotes: %s', (provider) => {
			expect(isMobileSwapProvider(provider)).toBe(provider === SwapProvider.ICP_SWAP);
		});
	});
});
