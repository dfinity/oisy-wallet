import { mapEthereumErrorMsg, toastEthereumTransactionError } from '$eth/utils/eth-error.utils';
import * as toasts from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';

describe('eth-error.utils', () => {
	// The error a staging "send max" came back with, as ethers hands it over: the node's own answer
	// nested under `error`, and re-serialised into the message ethers itself throws.
	const gasRequiredExceedsAllowance = Object.assign(
		new Error(
			'could not coalesce error (error={ "code": -32000, "message": "gas required exceeds allowance (17277)" }, payload={ "id": 120, "jsonrpc": "2.0", "method": "eth_sendRawTransaction" }, code=UNKNOWN_ERROR, version=6.17.0)'
		),
		{
			code: 'UNKNOWN_ERROR',
			error: { code: -32000, message: 'gas required exceeds allowance (17277)' }
		}
	);

	describe('mapEthereumErrorMsg', () => {
		it('explains a balance that cannot cover what the transaction reserves', () => {
			expect(mapEthereumErrorMsg(gasRequiredExceedsAllowance)).toBe(
				en.send.error.ethereum_insufficient_funds
			);
		});

		it('explains an insufficient funds error nested under info', () => {
			const err = Object.assign(new Error('missing revert data'), {
				info: { error: { code: -32000, message: 'insufficient funds for gas * price + value' } }
			});

			expect(mapEthereumErrorMsg(err)).toBe(en.send.error.ethereum_insufficient_funds);
		});

		it('explains an error ethers itself recognised as insufficient funds', () => {
			const err = Object.assign(new Error('insufficient funds'), { code: 'INSUFFICIENT_FUNDS' });

			expect(mapEthereumErrorMsg(err)).toBe(en.send.error.ethereum_insufficient_funds);
		});

		it('follows the cause chain', () => {
			const err = new Error('sending the transaction failed', {
				cause: gasRequiredExceedsAllowance
			});

			expect(mapEthereumErrorMsg(err)).toBe(en.send.error.ethereum_insufficient_funds);
		});

		it('does not mistake an ERC-20 approval revert for a balance shortfall', () => {
			// A different failure with a different fix: the spender's allowance is too low, and no
			// amount of balance changes that.
			const err = Object.assign(
				new Error('execution reverted: ERC20: transfer amount exceeds allowance'),
				{ code: 'CALL_EXCEPTION' }
			);

			expect(mapEthereumErrorMsg(err)).toBeUndefined();
		});

		it('does not blame the balance for a contract that reverts with the same words', () => {
			// The contract is refusing the call, for reasons of its own: the account may well hold
			// enough to pay for gas, and telling it otherwise sends the user after the wrong fix.
			const err = Object.assign(new Error('execution reverted: insufficient funds'), {
				code: 'CALL_EXCEPTION',
				reason: 'insufficient funds'
			});

			expect(mapEthereumErrorMsg(err)).toBeUndefined();
		});

		it('does not blame the balance for a revert the node reports as a server error', () => {
			// Older nodes answer a reverting gas estimate with -32000 too, the revert reason in the
			// message. The code alone therefore does not make it a rejection of the account.
			const err = Object.assign(new Error('could not coalesce error'), {
				code: 'UNKNOWN_ERROR',
				error: { code: -32000, message: 'execution reverted: insufficient funds' }
			});

			expect(mapEthereumErrorMsg(err)).toBeUndefined();
		});

		it('trusts only the node answer, not wording that turns up elsewhere in the chain', () => {
			const err = new Error('insufficient funds for gas * price + value');

			expect(mapEthereumErrorMsg(err)).toBeUndefined();
		});

		it('leaves an error it cannot explain to the caller', () => {
			expect(mapEthereumErrorMsg(new Error('nonce too low'))).toBeUndefined();

			expect(mapEthereumErrorMsg('boom')).toBeUndefined();

			expect(mapEthereumErrorMsg(undefined)).toBeUndefined();
		});
	});

	describe('toastEthereumTransactionError', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(toasts, 'toastsErrorNoTrace').mockImplementation(() => Symbol('toast'));
		});

		it('shows the explanation on its own, keeping the node text out of the message', () => {
			toastEthereumTransactionError({
				err: gasRequiredExceedsAllowance,
				fallbackMsg: en.send.error.unexpected
			});

			expect(toasts.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.ethereum_insufficient_funds },
				err: gasRequiredExceedsAllowance
			});

			expect(toasts.toastsError).not.toHaveBeenCalled();
		});

		it('keeps the detail on screen for a failure it cannot explain', () => {
			const err = new Error('nonce too low');

			toastEthereumTransactionError({ err, fallbackMsg: en.send.error.unexpected });

			expect(toasts.toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.unexpected },
				err
			});

			expect(toasts.toastsErrorNoTrace).not.toHaveBeenCalled();
		});
	});
});
