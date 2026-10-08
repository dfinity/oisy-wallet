import * as sendAnalytics from '$eth/services/eth-transaction-send-analytics.services';
import { mapEthereumErrorMsg, toastEthereumTransactionError } from '$eth/utils/eth-error.utils';
import { ZERO } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import * as toasts from '$lib/stores/toasts.store';
import * as i18nUtils from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { SigningKey } from 'ethers/crypto';
import { Transaction } from 'ethers/transaction';

const { estimateGas, safeEstimateGas } = vi.hoisted(() => ({
	estimateGas: vi.fn(),
	safeEstimateGas: vi.fn()
}));

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: () => ({ estimateGas, safeEstimateGas })
}));

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
		const sendParams = {
			token: mockValidErc20Token,
			context: PLAUSIBLE_EVENT_CONTEXTS.SEND
		} as const;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
			vi.spyOn(toasts, 'toastsErrorNoTrace').mockImplementation(() => Symbol('toast'));
		});

		it('shows the explanation on its own, keeping the node text out of the message', () => {
			toastEthereumTransactionError({
				err: gasRequiredExceedsAllowance,
				fallbackMsg: en.send.error.unexpected,
				...sendParams
			});

			expect(toasts.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.ethereum_insufficient_funds },
				err: gasRequiredExceedsAllowance
			});

			expect(toasts.toastsError).not.toHaveBeenCalled();
		});

		it('keeps the detail on screen for a failure it cannot explain', () => {
			const err = new Error('nonce too low');

			toastEthereumTransactionError({ err, fallbackMsg: en.send.error.unexpected, ...sendParams });

			expect(toasts.toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.send.error.unexpected },
				err
			});

			expect(toasts.toastsErrorNoTrace).not.toHaveBeenCalled();
		});

		describe('a send that ran out of gas', () => {
			const nodeMessage = 'out of gas: gas required exceeds: 60243';

			// Signed with a well-known development key, so that it decodes and its sender recovers.
			const transaction = Transaction.from({
				type: 2,
				chainId: 8453n,
				nonce: 184,
				maxPriorityFeePerGas: 2_920_000n,
				maxFeePerGas: 22_920_000n,
				gasLimit: 60_243n,
				to: '0x2222222222222222222222222222222222222222',
				value: ZERO,
				data: '0xa9059cbb'
			});

			transaction.signature = new SigningKey(
				'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
			).sign(transaction.unsignedHash);

			const signedTransaction = transaction.serialized;
			const sender = `${transaction.from}`;

			// The error a Base send came back with, as ethers hands it over: the node's answer under
			// `error`, and the request it refused, the signed transaction inside, under `payload`.
			const outOfGas = ({ withRequest }: { withRequest: boolean }) =>
				Object.assign(
					new Error(
						`could not coalesce error (error={ "code": -32000, "message": "${nodeMessage}" }, code=UNKNOWN_ERROR, version=6.17.0)`
					),
					{
						code: 'UNKNOWN_ERROR',
						error: { code: -32000, message: nodeMessage },
						...(withRequest && {
							payload: {
								id: 23,
								jsonrpc: '2.0',
								method: 'eth_sendRawTransaction',
								params: [signedTransaction]
							}
						})
					}
				);

			const toastText = () => vi.mocked(toasts.toastsErrorNoTrace).mock.calls[0]?.[0].msg.text;

			beforeEach(() => {
				estimateGas.mockResolvedValue(62_989n);

				vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
			});

			it('explains it, then gives the gas sent, the gas needed, the hash and the unsigned transaction, a line each', async () => {
				const err = outOfGas({ withRequest: true });

				toastEthereumTransactionError({
					err,
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(toasts.toastsErrorNoTrace).toHaveBeenCalledOnce());

				expect(toasts.toastsErrorNoTrace).toHaveBeenCalledExactlyOnceWith({
					msg: {
						text: [
							en.send.error.ethereum_out_of_gas,
							'Gas sent: 60,243 · Gas needed: 62,989',
							`Transaction hash: ${transaction.hash}`,
							`Unsigned transaction: ${transaction.unsignedSerialized}`
						].join('<br>'),
						renderAsHtml: true
					},
					err
				});

				expect(toasts.toastsError).not.toHaveBeenCalled();
			});

			// Whoever a screenshot of it reaches could broadcast a signed transaction until its nonce is
			// used; neither the hash nor the unsigned form can be sent.
			it('never shows the signed transaction or its signature', async () => {
				toastEthereumTransactionError({
					err: outOfGas({ withRequest: true }),
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(toasts.toastsErrorNoTrace).toHaveBeenCalledOnce());

				expect(toastText()).not.toContain(signedTransaction);
				expect(toastText()).not.toContain(`${transaction.signature?.r}`.slice(2));
				expect(toastText()).not.toContain(`${transaction.signature?.s}`.slice(2));
			});

			it('asks the network again for the gas the same transaction needs', async () => {
				toastEthereumTransactionError({
					err: outOfGas({ withRequest: true }),
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(toasts.toastsErrorNoTrace).toHaveBeenCalledOnce());

				expect(estimateGas).toHaveBeenCalledExactlyOnceWith({
					from: sender,
					to: '0x2222222222222222222222222222222222222222',
					data: '0xa9059cbb',
					value: ZERO
				});

				// It reports a failure with the raw error, which carries the transaction it estimated.
				expect(safeEstimateGas).not.toHaveBeenCalled();
			});

			it('gives only the gas sent when the gas needed cannot be estimated', async () => {
				estimateGas.mockRejectedValue(new Error('missing response'));

				toastEthereumTransactionError({
					err: outOfGas({ withRequest: true }),
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(toasts.toastsErrorNoTrace).toHaveBeenCalledOnce());

				expect(toastText()).toBe(
					[
						en.send.error.ethereum_out_of_gas,
						'Gas sent: 60,243',
						`Transaction hash: ${transaction.hash}`,
						`Unsigned transaction: ${transaction.unsignedSerialized}`
					].join('<br>')
				);
			});

			it('shows the toast without the gas needed once the estimate has taken 3 seconds', async () => {
				vi.useFakeTimers();

				try {
					estimateGas.mockReturnValue(new Promise(() => {}));

					toastEthereumTransactionError({
						err: outOfGas({ withRequest: true }),
						fallbackMsg: en.send.error.unexpected,
						...sendParams
					});

					await vi.advanceTimersByTimeAsync(2_999);

					expect(toasts.toastsErrorNoTrace).not.toHaveBeenCalled();

					await vi.advanceTimersByTimeAsync(1);

					expect(toastText()).toBe(
						[
							en.send.error.ethereum_out_of_gas,
							'Gas sent: 60,243',
							`Transaction hash: ${transaction.hash}`,
							`Unsigned transaction: ${transaction.unsignedSerialized}`
						].join('<br>')
					);

					expect(JSON.stringify(vi.mocked(analytics.trackEvent).mock.calls)).not.toContain(
						'gas_needed'
					);
				} finally {
					vi.useRealTimers();
				}
			});

			it('falls back to the generic toast when composing the explanation throws', async () => {
				const replace = vi.spyOn(i18nUtils, 'replacePlaceholders').mockImplementationOnce(() => {
					throw new Error('cannot compose');
				});

				try {
					const err = outOfGas({ withRequest: true });

					toastEthereumTransactionError({
						err,
						fallbackMsg: en.send.error.unexpected,
						...sendParams
					});

					await vi.waitFor(() => expect(toasts.toastsError).toHaveBeenCalledOnce());

					expect(toasts.toastsError).toHaveBeenCalledExactlyOnceWith({
						msg: { text: en.send.error.unexpected },
						err
					});

					expect(toasts.toastsErrorNoTrace).not.toHaveBeenCalled();
				} finally {
					replace.mockRestore();
				}
			});

			it('keeps to the explanation when the error carries no signed transaction', async () => {
				toastEthereumTransactionError({
					err: outOfGas({ withRequest: false }),
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(toasts.toastsErrorNoTrace).toHaveBeenCalledOnce());

				expect(toastText()).toBe(en.send.error.ethereum_out_of_gas);

				expect(estimateGas).not.toHaveBeenCalled();
			});

			it('tracks the flow, the token, both gas figures and the node answer', async () => {
				const track = vi.spyOn(sendAnalytics, 'trackEthTransactionSendOutOfGas');

				toastEthereumTransactionError({
					err: outOfGas({ withRequest: true }),
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(track).toHaveBeenCalledOnce());

				expect(track).toHaveBeenCalledExactlyOnceWith({
					context: PLAUSIBLE_EVENT_CONTEXTS.SEND,
					token: mockValidErc20Token,
					gasSent: 60_243n,
					gasNeeded: 62_989n,
					errorCode: -32000,
					nodeMessage
				});
			});

			it('never tracks the signed transaction or the wallet it names', async () => {
				toastEthereumTransactionError({
					err: outOfGas({ withRequest: true }),
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(analytics.trackEvent).toHaveBeenCalledOnce());

				const tracked = JSON.stringify(vi.mocked(analytics.trackEvent).mock.calls).toLowerCase();

				expect(tracked).not.toContain(signedTransaction.slice(2, 66).toLowerCase());
				expect(tracked).not.toContain(sender.slice(2).toLowerCase());
			});

			it('tracks nothing of a failed re-estimate, whose error names the transaction', async () => {
				estimateGas.mockRejectedValue(
					new Error(
						`execution reverted (action="estimateGas", transaction={ "data": "0xa9059cbb", "from": "${sender}", "to": "0x2222222222222222222222222222222222222222" }, code=CALL_EXCEPTION, version=6.17.0)`
					)
				);

				toastEthereumTransactionError({
					err: outOfGas({ withRequest: true }),
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				await vi.waitFor(() => expect(toasts.toastsErrorNoTrace).toHaveBeenCalledOnce());

				expect(analytics.trackEvent).toHaveBeenCalledOnce();

				const tracked = JSON.stringify(vi.mocked(analytics.trackEvent).mock.calls).toLowerCase();

				expect(tracked).not.toContain(sender.slice(2).toLowerCase());
				expect(tracked).not.toContain('gas_needed');
			});

			// A send runs calls of its own before it signs, an allowance check for one, and ethers
			// attaches their request to the error the same way.
			it.each(['eth_call', 'eth_estimateGas'])(
				'does not take a failed %s for a refused send',
				(method) => {
					const err = Object.assign(new Error('missing revert data'), {
						code: 'CALL_EXCEPTION',
						info: {
							error: { code: -32000, message: 'out of gas' },
							payload: {
								id: 7,
								jsonrpc: '2.0',
								method,
								params: [{ to: '0x2222222222222222222222222222222222222222', data: '0xdd62ed3e' }]
							}
						}
					});

					toastEthereumTransactionError({
						err,
						fallbackMsg: en.send.error.unexpected,
						...sendParams
					});

					expect(toasts.toastsError).toHaveBeenCalledExactlyOnceWith({
						msg: { text: en.send.error.unexpected },
						err
					});

					expect(toasts.toastsErrorNoTrace).not.toHaveBeenCalled();
					expect(analytics.trackEvent).not.toHaveBeenCalled();
				}
			);

			it('trusts only the node answer, not the same words elsewhere in the chain', () => {
				const err = new Error('out of gas');

				toastEthereumTransactionError({
					err,
					fallbackMsg: en.send.error.unexpected,
					...sendParams
				});

				expect(toasts.toastsError).toHaveBeenCalledExactlyOnceWith({
					msg: { text: en.send.error.unexpected },
					err
				});
			});
		});
	});
});
