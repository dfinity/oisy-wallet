import { EthNonceReadError, EthSubmissionUnconfirmedError } from '$eth/types/send';
import {
	LifiFeeChangedError,
	LifiQuoteRejectedError,
	LifiRouteUnsupportedError
} from '$lib/types/errors';
import { toLifiSwapErrorType } from '$lib/utils/lifi-swap-error.utils';

describe('lifi-swap-error.utils', () => {
	describe('toLifiSwapErrorType', () => {
		it.each([
			{ type: 'fee_changed', err: new LifiFeeChangedError({ gas: 1n, l1Fee: 1n }) },
			{
				type: 'slippage_exceeded',
				err: new Error('Slippage exceeded. LI.FI no longer has a route for the swap.')
			},
			{ type: 'quote_rejected', err: new LifiQuoteRejectedError('LI.FI calldata rejected: x') },
			{
				type: 'quote_rejected',
				err: new LifiRouteUnsupportedError("LI.FI's refreshed route via across cannot be executed")
			},
			{
				type: 'insufficient_funds',
				err: Object.assign(new Error('insufficient funds'), { code: 'INSUFFICIENT_FUNDS' })
			}
		])('should report $type', ({ type, err }) => {
			expect(toLifiSwapErrorType(err)).toBe(type);
		});

		// The EVM send explains these too, but neither is about the balance.
		it.each([
			{
				outcome: 'a nonce that could not be read',
				err: new EthNonceReadError(new Error('Internal error'))
			},
			{
				outcome: 'a submission whose outcome is unknown',
				err: new EthSubmissionUnconfirmedError(new Error('Internal error'))
			}
		])('should report $outcome as unknown', ({ err }) => {
			expect(toLifiSwapErrorType(err)).toBe('unknown');
		});

		// What the SDK throws for a failed request: its message names the URL, addresses included.
		it('should report anything else as unknown, never its message', () => {
			const err = new Error(
				'Request failed with status code 500 https://li.quest/v1/quote?fromAddress=0x000000000000000000000000000000000000dEaD'
			);

			expect(toLifiSwapErrorType(err)).toBe('unknown');
		});
	});
});
