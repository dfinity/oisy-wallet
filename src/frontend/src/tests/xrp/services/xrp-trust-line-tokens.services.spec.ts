import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import * as backendApi from '$lib/api/backend.api';
import {
	TRACK_COUNT_XRP_TRUST_LINE_ADD_ERROR,
	TRACK_COUNT_XRP_TRUST_LINE_REMOVE_ERROR
} from '$lib/constants/analytics.constants';
import { ProgressStepsAddToken, ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import * as analyticsServices from '$lib/services/analytics.services';
import * as saveCustomTokensServices from '$lib/services/save-custom-tokens.services';
import * as toastsStore from '$lib/stores/toasts.store';
import * as consoleUtils from '$lib/utils/console.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockXrpAddress, mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import {
	addXrpTrustLineToken,
	removeXrpTrustLineToken,
	saveUnsavedXrpTrustLineTokens
} from '$xrp/services/xrp-trust-line-tokens.services';
import * as xrpTrustSetServices from '$xrp/services/xrp-trust-set.services';
import { XrpNetworks } from '$xrp/types/network';
import {
	XrpSendAlreadyInFlightError,
	XrpSendNotGuardedError,
	XrpTrustLineBalanceNotZeroError,
	XrpTrustLineNotHeldError,
	XrpTrustSetUnfundedError
} from '$xrp/types/xrp-send';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';

vi.mock('$lib/services/save-custom-tokens.services', () => ({
	saveCustomTokens: vi.fn()
}));

vi.mock('$xrp/services/xrp-trust-set.services', () => ({
	submitXrpTrustSet: vi.fn()
}));

describe('xrp-trust-line-tokens.services', () => {
	// Each held line is tried once per session, so every case uses tokens of its own.
	const tokenOf = (currency: string) =>
		toXrpTrustLineToken({
			identity: { currency, issuer: mockXrpAddress2 },
			network: XRP_MAINNET_NETWORK
		});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(saveCustomTokensServices.saveCustomTokens).mockResolvedValue(undefined);
	});

	describe('saveUnsavedXrpTrustLineTokens', () => {
		it('saves each token enabled, by its currency and issuer only', async () => {
			await saveUnsavedXrpTrustLineTokens({
				identity: mockIdentity,
				tokens: [tokenOf('AAA'), tokenOf('BBB')]
			});

			expect(saveCustomTokensServices.saveCustomTokens).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokens: [
					{
						currency: 'AAA',
						issuer: mockXrpAddress2,
						networkKey: 'XrpTrustLineMainnet',
						enabled: true
					},
					{
						currency: 'BBB',
						issuer: mockXrpAddress2,
						networkKey: 'XrpTrustLineMainnet',
						enabled: true
					}
				]
			});
		});

		it('tries a token once per session', async () => {
			const token = tokenOf('CCC');

			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] });
			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] });

			expect(saveCustomTokensServices.saveCustomTokens).toHaveBeenCalledOnce();
		});

		it('does not retry a token whose save failed, and does not throw', async () => {
			vi.mocked(saveCustomTokensServices.saveCustomTokens).mockRejectedValue(new Error('fail'));
			const consoleSpy = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});
			const token = tokenOf('DDD');

			await expect(
				saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] })
			).resolves.toBeUndefined();

			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [token] });

			expect(saveCustomTokensServices.saveCustomTokens).toHaveBeenCalledOnce();
			expect(consoleSpy).toHaveBeenCalledOnce();
		});

		it('saves nothing for no tokens', async () => {
			await saveUnsavedXrpTrustLineTokens({ identity: mockIdentity, tokens: [] });

			expect(saveCustomTokensServices.saveCustomTokens).not.toHaveBeenCalled();
		});
	});

	describe('addXrpTrustLineToken', () => {
		const token = { ...RLUSD_TOKEN, enabled: true };

		const callbacks = () => ({
			progress: vi.fn(),
			modalNext: vi.fn(),
			onSuccess: vi.fn(),
			onError: vi.fn()
		});

		const params = { identity: mockIdentity, source: mockXrpAddress, token, fee: 12n };

		beforeEach(() => {
			vi.useFakeTimers();
			vi.mocked(xrpTrustSetServices.submitXrpTrustSet).mockResolvedValue({
				txHash: 'AB'.repeat(32),
				submitResult: { engineResult: 'tesSUCCESS', txHash: 'AB'.repeat(32) }
			});
			vi.spyOn(toastsStore, 'toastsShow');
			vi.spyOn(toastsStore, 'toastsError');
			vi.spyOn(analyticsServices, 'trackEvent').mockReturnValue(undefined);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('sends the reviewed token with the reviewed fee, from the user’s address', async () => {
			await addXrpTrustLineToken({ ...params, ...callbacks() });

			expect(xrpTrustSetServices.submitXrpTrustSet).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				source: mockXrpAddress,
				token,
				change: 'add',
				fee: 12n,
				progress: expect.any(Function)
			});
		});

		it('moves the modal to its progress before anything is sent', async () => {
			const { modalNext, ...rest } = callbacks();

			vi.mocked(xrpTrustSetServices.submitXrpTrustSet).mockImplementation(() => {
				expect(modalNext).toHaveBeenCalledOnce();

				return Promise.resolve({ txHash: 'AB'.repeat(32), submitResult: undefined });
			});

			await addXrpTrustLineToken({ ...params, modalNext, ...rest });

			expect(xrpTrustSetServices.submitXrpTrustSet).toHaveBeenCalledOnce();
		});

		// On the modal's own step scale: signing shows as its `SAVE`, the submit as its `UPDATE_UI`.
		it('reports progress on the add-token steps, then done', async () => {
			const { progress, ...rest } = callbacks();

			vi.mocked(xrpTrustSetServices.submitXrpTrustSet).mockImplementation(
				({ progress: report }) => {
					report?.(ProgressStepsSendXrp.INITIALIZATION);
					report?.(ProgressStepsSendXrp.SIGN);
					report?.(ProgressStepsSendXrp.SEND);

					return Promise.resolve({ txHash: 'AB'.repeat(32), submitResult: undefined });
				}
			);

			await addXrpTrustLineToken({ ...params, progress, ...rest });

			expect(progress.mock.calls.map(([step]) => step)).toEqual([
				ProgressStepsAddToken.INITIALIZATION,
				ProgressStepsAddToken.SAVE,
				ProgressStepsAddToken.UPDATE_UI,
				ProgressStepsAddToken.DONE
			]);
		});

		// Submitted, not settled: the token is not added yet, so nothing says it was.
		it('says the transaction was submitted, then closes', async () => {
			const { onSuccess, onError, ...rest } = callbacks();

			await addXrpTrustLineToken({ ...params, onSuccess, onError, ...rest });

			expect(toastsStore.toastsShow).toHaveBeenCalledExactlyOnceWith({
				text: en.tokens.import.text.xrp_add_submitted.replace('$symbol', RLUSD_TOKEN.symbol),
				level: 'info',
				duration: 5000
			});
			expect(onSuccess).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(750);

			expect(onSuccess).toHaveBeenCalledOnce();
			expect(onError).not.toHaveBeenCalled();
		});

		// Its outcome is reported once the ledger decides, from the record.
		it('reports no outcome of its own once submitted', async () => {
			await addXrpTrustLineToken({ ...params, ...callbacks() });

			expect(analyticsServices.trackEvent).not.toHaveBeenCalled();
		});

		// Saved once the ledger holds the line, from the wallet's reading of it — not here.
		it('does not save the token itself', async () => {
			await addXrpTrustLineToken({ ...params, ...callbacks() });

			await vi.advanceTimersByTimeAsync(750);

			expect(saveCustomTokensServices.saveCustomTokens).not.toHaveBeenCalled();
		});

		it.each([
			['no address', { source: undefined }],
			[
				'a network that cannot sign',
				{
					token: {
						...token,
						network: { ...XRP_MAINNET_NETWORK, id: parseNetworkId('XRP_TESTNET') }
					}
				}
			]
		])('refuses with %s, without moving on', async (...[, override]) => {
			const { modalNext, onError, ...rest } = callbacks();

			await addXrpTrustLineToken({ ...params, ...override, modalNext, onError, ...rest });

			expect(toastsStore.toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.tokens.import.error.xrp_state_unavailable }
			});
			expect(modalNext).not.toHaveBeenCalled();
			expect(xrpTrustSetServices.submitXrpTrustSet).not.toHaveBeenCalled();
		});

		it.each([
			[
				'an unresolved transaction from the address',
				new XrpSendAlreadyInFlightError('open'),
				en.tokens.import.error.xrp_transaction_in_flight
			],
			[
				'a guard that could not be asked',
				new XrpSendNotGuardedError('down'),
				en.tokens.import.error.xrp_not_guarded
			],
			[
				'a balance that no longer covers it',
				new XrpTrustSetUnfundedError('short'),
				en.tokens.import.error.xrp_trust_set_unfunded
			],
			['anything else', new Error('boom'), en.tokens.import.error.xrp_add_failed]
		])('reports %s and returns to the form', async (...[, err, text]) => {
			vi.mocked(xrpTrustSetServices.submitXrpTrustSet).mockRejectedValue(err);
			const { progress, onSuccess, onError, ...rest } = callbacks();

			await addXrpTrustLineToken({ ...params, progress, onSuccess, onError, ...rest });

			expect(toastsStore.toastsError).toHaveBeenCalledExactlyOnceWith({ msg: { text }, err });
			expect(analyticsServices.trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_XRP_TRUST_LINE_ADD_ERROR,
				metadata: { token: RLUSD_TOKEN.symbol, network: 'XRP', fee: '12' }
			});
			expect(onError).toHaveBeenCalledOnce();
			expect(progress).not.toHaveBeenCalledWith(ProgressStepsAddToken.DONE);

			await vi.advanceTimersByTimeAsync(750);

			expect(onSuccess).not.toHaveBeenCalled();
		});
	});

	describe('removeXrpTrustLineToken', () => {
		const token = { ...RLUSD_TOKEN, enabled: true };

		const callbacks = () => ({ onSuccess: vi.fn(), onError: vi.fn() });

		const params = { identity: mockIdentity, source: mockXrpAddress, token, fee: 12n };

		beforeEach(() => {
			vi.mocked(xrpTrustSetServices.submitXrpTrustSet).mockResolvedValue({
				txHash: 'AB'.repeat(32),
				submitResult: { engineResult: 'tesSUCCESS', txHash: 'AB'.repeat(32) }
			});
			vi.spyOn(toastsStore, 'toastsShow');
			vi.spyOn(toastsStore, 'toastsError');
			vi.spyOn(analyticsServices, 'trackEvent').mockReturnValue(undefined);
			vi.spyOn(backendApi, 'removeCustomToken').mockResolvedValue(undefined);
		});

		it('sends the removal of the token with the confirmed fee, from the user’s address', async () => {
			await removeXrpTrustLineToken({ ...params, ...callbacks() });

			expect(xrpTrustSetServices.submitXrpTrustSet).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				network: XrpNetworks.mainnet,
				source: mockXrpAddress,
				token,
				change: 'remove',
				fee: 12n
			});
		});

		// Submitted, not settled: the line is still on the ledger, so nothing says it is gone.
		it('says the transaction was submitted, then hands over', async () => {
			const { onSuccess, onError } = callbacks();

			await removeXrpTrustLineToken({ ...params, onSuccess, onError });

			expect(toastsStore.toastsShow).toHaveBeenCalledExactlyOnceWith({
				text: en.tokens.import.text.xrp_remove_submitted.replace('$symbol', RLUSD_TOKEN.symbol),
				level: 'info',
				duration: 5000
			});
			expect(onSuccess).toHaveBeenCalledOnce();
			expect(onError).not.toHaveBeenCalled();
		});

		it('reports no outcome of its own once submitted', async () => {
			await removeXrpTrustLineToken({ ...params, ...callbacks() });

			expect(analyticsServices.trackEvent).not.toHaveBeenCalled();
		});

		// The line is held until the `TrustSet` validates, and a held line without an entry is saved
		// back; the entry goes once the line has.
		it('leaves the backend entry alone', async () => {
			await removeXrpTrustLineToken({ ...params, ...callbacks() });

			expect(backendApi.removeCustomToken).not.toHaveBeenCalled();
		});

		it.each([
			['no address', { source: undefined }],
			[
				'a network that cannot sign',
				{
					token: {
						...token,
						network: { ...XRP_MAINNET_NETWORK, id: parseNetworkId('XRP_TESTNET') }
					}
				}
			]
		])('refuses with %s', async (...[, override]) => {
			const { onSuccess, onError } = callbacks();

			await removeXrpTrustLineToken({ ...params, ...override, onSuccess, onError });

			expect(toastsStore.toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.tokens.import.error.xrp_state_unavailable }
			});
			expect(onError).toHaveBeenCalledOnce();
			expect(onSuccess).not.toHaveBeenCalled();
			expect(xrpTrustSetServices.submitXrpTrustSet).not.toHaveBeenCalled();
		});

		it.each([
			[
				'an unresolved transaction from the address',
				new XrpSendAlreadyInFlightError('open'),
				en.tokens.import.error.xrp_transaction_in_flight
			],
			[
				'a guard that could not be asked',
				new XrpSendNotGuardedError('down'),
				en.tokens.import.error.xrp_not_guarded
			],
			[
				'a balance that no longer pays the fee',
				new XrpTrustSetUnfundedError('short'),
				en.tokens.import.error.xrp_insufficient_fee
			],
			[
				'a line the account no longer holds',
				new XrpTrustLineNotHeldError('gone'),
				en.tokens.import.error.xrp_remove_not_held.replace('$symbol', RLUSD_TOKEN.symbol)
			],
			[
				'a balance that is no longer zero',
				new XrpTrustLineBalanceNotZeroError('1'),
				en.tokens.import.error.xrp_remove_balance_not_zero.replace('$symbol', RLUSD_TOKEN.symbol)
			],
			['anything else', new Error('boom'), en.tokens.import.error.xrp_remove_failed]
		])('reports %s and stays', async (...[, err, text]) => {
			vi.mocked(xrpTrustSetServices.submitXrpTrustSet).mockRejectedValue(err);
			const { onSuccess, onError } = callbacks();

			await removeXrpTrustLineToken({ ...params, onSuccess, onError });

			expect(toastsStore.toastsError).toHaveBeenCalledExactlyOnceWith({ msg: { text }, err });
			expect(analyticsServices.trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_XRP_TRUST_LINE_REMOVE_ERROR,
				metadata: { token: RLUSD_TOKEN.symbol, network: 'XRP', fee: '12' }
			});
			expect(onError).toHaveBeenCalledExactlyOnceWith(err);
			expect(onSuccess).not.toHaveBeenCalled();
		});
	});
});
