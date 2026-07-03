import { approve } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import { deposit as depositApi } from '$lib/api/oisy-trade.api';
import * as appConstants from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SUBCONTEXT_TRADING
} from '$lib/enums/plausible';
import { ProgressStepsTradingDeposit } from '$lib/enums/progress-steps';
import { depositOisyTrade } from '$lib/services/oisy-trade.deposit.services';
import { loadOisyTrade } from '$lib/services/oisy-trade.services';
import { trackTrading } from '$lib/services/trading-analytics.services';
import { toastsError } from '$lib/stores/toasts.store';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$icp/api/icrc-ledger.api');
vi.mock('$lib/api/oisy-trade.api');
vi.mock('$lib/services/oisy-trade.services');
vi.mock('$lib/services/trading-analytics.services');
vi.mock('$lib/utils/wallet.utils');
vi.mock('$lib/stores/toasts.store');

describe('oisy-trade.deposit.services', () => {
	const OISY_TRADE_CANISTER_ID = 'aaaaa-aa';

	const token: IcToken = { ...mockValidIcToken, fee: 123n };
	const amount = 1_000n;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(appConstants, 'OISY_TRADE_CANISTER_ID', 'get').mockImplementation(
			() => OISY_TRADE_CANISTER_ID
		);

		vi.mocked(approve).mockResolvedValue(1n);
		vi.mocked(depositApi).mockResolvedValue({ block_index: 7n });
		vi.mocked(loadOisyTrade).mockResolvedValue(undefined);
		vi.mocked(waitAndTriggerWallet).mockResolvedValue();
	});

	describe('depositOisyTrade', () => {
		it('approves amount plus fee, deposits, reloads and returns true', async () => {
			const result = await depositOisyTrade({ identity: mockIdentity, token, amount });

			expect(result).toBeTruthy();

			expect(approve).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					identity: mockIdentity,
					ledgerCanisterId: token.ledgerCanisterId,
					amount: amount + token.fee,
					spender: { owner: Principal.fromText(OISY_TRADE_CANISTER_ID) }
				})
			);

			expect(depositApi).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				request: {
					token_id: { ledger_id: Principal.fromText(token.ledgerCanisterId) },
					amount
				}
			});

			expect(loadOisyTrade).toHaveBeenCalledWith({ identity: mockIdentity });
			expect(waitAndTriggerWallet).toHaveBeenCalledOnce();
			expect(toastsError).not.toHaveBeenCalled();
		});

		it('reports every progress step in order on success', async () => {
			const progress = vi.fn();

			await depositOisyTrade({ identity: mockIdentity, token, amount, progress });

			expect(progress.mock.calls.map(([step]) => step)).toEqual([
				ProgressStepsTradingDeposit.APPROVE,
				ProgressStepsTradingDeposit.DEPOSIT,
				ProgressStepsTradingDeposit.UPDATE_UI,
				ProgressStepsTradingDeposit.DONE
			]);
		});

		it('tracks executing and success events with the token volume on success', async () => {
			const analyticsAmount = 123_456_789n;

			await depositOisyTrade({ identity: mockIdentity, token, amount: analyticsAmount });

			expect(trackTrading).toHaveBeenNthCalledWith(1, {
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.DEPOSIT,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				token: token.symbol,
				volume: '1.23456789'
			});
			expect(trackTrading).toHaveBeenNthCalledWith(2, {
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.DEPOSIT,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				token: token.symbol,
				volume: '1.23456789'
			});
			expect(trackTrading).toHaveBeenCalledTimes(2);
		});

		it('sets the approve expiry to now plus five minutes', async () => {
			const nowNs = 1_000_000n;
			vi.useFakeTimers();
			vi.setSystemTime(Number(nowNs / 1_000_000n));

			await depositOisyTrade({ identity: mockIdentity, token, amount });

			const [[{ expiresAt }]] = vi.mocked(approve).mock.calls;

			// 5 minutes in nanoseconds.
			expect(expiresAt).toBe(BigInt(Date.now()) * 1_000_000n + 5n * 60n * 1_000_000_000n);

			vi.useRealTimers();
		});

		it('returns false and shows a toast when the identity is nullish', async () => {
			const result = await depositOisyTrade({ identity: null, token, amount });

			expect(result).toBeFalsy();
			expect(approve).not.toHaveBeenCalled();
			expect(toastsError).toHaveBeenCalledWith(
				expect.objectContaining({
					msg: { text: en.trading.deposit.error.deposit_failed }
				})
			);
		});

		it('returns false and shows a toast when the token fee is unknown', async () => {
			const result = await depositOisyTrade({
				identity: mockIdentity,
				token: { ...token, fee: undefined } as unknown as IcToken,
				amount
			});

			expect(result).toBeFalsy();
			expect(approve).not.toHaveBeenCalled();
			expect(toastsError).toHaveBeenCalledOnce();
		});

		it('returns false and does not deposit when approve fails', async () => {
			vi.mocked(approve).mockRejectedValue(new Error('approve failed'));

			const result = await depositOisyTrade({ identity: mockIdentity, token, amount });

			expect(result).toBeFalsy();
			expect(depositApi).not.toHaveBeenCalled();
			expect(loadOisyTrade).not.toHaveBeenCalled();
			expect(toastsError).toHaveBeenCalledOnce();
		});

		it('tracks executing and sanitized error events when approve fails', async () => {
			vi.mocked(approve).mockRejectedValue(new Error('approve failed, Request ID: abc123'));

			const result = await depositOisyTrade({ identity: mockIdentity, token, amount });

			expect(result).toBeFalsy();
			expect(trackTrading).toHaveBeenNthCalledWith(1, {
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.DEPOSIT,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				token: token.symbol,
				volume: '0.00001'
			});
			expect(trackTrading).toHaveBeenNthCalledWith(2, {
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.DEPOSIT,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				token: token.symbol,
				volume: '0.00001',
				error: 'approve failed'
			});
			expect(trackTrading).toHaveBeenCalledTimes(2);
		});

		it('returns false and does not reload when the deposit fails', async () => {
			vi.mocked(depositApi).mockRejectedValue(new Error('deposit failed'));

			const result = await depositOisyTrade({ identity: mockIdentity, token, amount });

			expect(result).toBeFalsy();
			expect(approve).toHaveBeenCalledOnce();
			expect(loadOisyTrade).not.toHaveBeenCalled();
			expect(waitAndTriggerWallet).not.toHaveBeenCalled();
			expect(toastsError).toHaveBeenCalledOnce();
		});
	});
});
