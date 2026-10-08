import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_TIP_ERROR_TYPES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { toTipErrorType, trackTip } from '$lib/services/tip-analytics.services';
import { IcrcTransferError } from '@icp-sdk/canisters/ledger/icrc';
import type { MockInstance } from 'vitest';

describe('tip-analytics.services', () => {
	describe('trackTip', () => {
		let track: MockInstance;

		beforeEach(() => {
			vi.restoreAllMocks();
			track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		});

		it('emits one event name for every step, with the step as a modifier', () => {
			// The whole point of the shape: a funnel is only answerable if each step is
			// the same event. `trackPersonalNoteShare` replaced six flat event names with
			// this for exactly that reason.
			trackTip({
				step: 'open',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});
			trackTip({
				step: 'claim',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			const names = track.mock.calls.map(([{ name }]) => name);

			expect(names).toEqual([PLAUSIBLE_EVENTS.TIP, PLAUSIBLE_EVENTS.TIP]);

			const modifiers = track.mock.calls.map(([{ metadata }]) => metadata?.event_modifier);

			expect(modifiers).toEqual(['open', 'claim']);
		});

		it('separates the two sides by source location', () => {
			trackTip({
				step: 'open',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});
			trackTip({
				step: 'open',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			const [sender, claimer] = track.mock.calls.map(([{ metadata }]) => metadata?.source_location);

			expect(sender).toBe('tip_sender');
			expect(claimer).toBe('tip_claimer');
		});

		it('sends the full shape of a step that cannot fail', () => {
			// A step that cannot fail still says `success`, so `(none)` on the
			// dashboard can only mean a call site forgot.
			trackTip({
				step: 'copy',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				symbol: 'ICP'
			});

			expect(track).toHaveBeenCalledExactlyOnceWith({
				name: PLAUSIBLE_EVENTS.TIP,
				metadata: {
					event_context: 'tips',
					event_modifier: 'copy',
					source_location: 'tip_sender',
					result_status: 'success',
					token_symbol: 'ICP'
				}
			});
		});

		it('sends the expiry as an event key and value', () => {
			trackTip({
				step: 'create',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				expiry: 'expiry_24h',
				symbol: 'ICP'
			});

			const [[{ metadata }]] = track.mock.calls;

			expect(metadata?.event_key).toBe('expiry');
			expect(metadata?.event_value).toBe('expiry_24h');
		});

		it('carries the error type of a failed step', () => {
			trackTip({
				step: 'claim',
				side: 'claimer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				errorType: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.UNCOVERED
			});

			const [[{ metadata }]] = track.mock.calls;

			expect(metadata?.result_status).toBe('error');
			expect(metadata?.result_error_type).toBe('uncovered');
		});

		it('omits fields that were not supplied', () => {
			trackTip({
				step: 'share',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			const [[{ metadata }]] = track.mock.calls;

			expect(metadata).not.toHaveProperty('result_error_type');
			expect(metadata).not.toHaveProperty('event_key');
			expect(metadata).not.toHaveProperty('event_value');
			expect(metadata).not.toHaveProperty('token_symbol');
		});

		it('never carries an amount, an error message or the keys outside the schema', () => {
			// A per-event figure would turn the analytics stream into a spending log.
			// The symbol answers "which assets are tipped" without doing that.
			trackTip({
				step: 'create',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				errorType: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.RATE_LIMITED,
				expiry: 'expiry_7d',
				symbol: 'ckBTC'
			});

			const [[{ metadata }]] = track.mock.calls;
			const keys = Object.keys(metadata ?? {});

			for (const key of [
				'amount',
				'token_amount',
				'result_error',
				'result_error_text',
				'symbol',
				'outcome',
				'expiry',
				'rate_limited'
			]) {
				expect(keys).not.toContain(key);
			}
		});
	});

	describe('toTipErrorType', () => {
		it.each([
			{ err: { NotFound: null }, expected: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.NOT_FOUND },
			{ err: { Uncovered: null }, expected: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.UNCOVERED },
			{
				err: { InsufficientFunds: null },
				expected: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INSUFFICIENT_FUNDS
			},
			{ err: { InvalidExpiry: null }, expected: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INVALID_EXPIRY },
			{ err: { MessageTooLong: null }, expected: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.MESSAGE_TOO_LONG },
			{
				err: { RateLimited: { max_calls: 5, window_ns: 60_000_000_000n } },
				expected: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.RATE_LIMITED
			}
		])('maps the tip canister variant $err to $expected', ({ err, expected }) => {
			expect(toTipErrorType(err)).toBe(expected);
		});

		it('reads only the name of a variant that carries free text', () => {
			const err = { InternalError: { msg: 'tip-7f3a for principal aaaaa-aa' } };

			expect(toTipErrorType(err)).toBe(PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INTERNAL_ERROR);
		});

		it('maps a ledger refusal of the approve to a prefixed category', () => {
			// `InsufficientFunds` exists on both sides; the ledger's means the sender
			// could not cover amount + fee, the canister's that a claim found them short.
			const err = new IcrcTransferError({
				msg: 'Failed to entitle the spender to transfer the amount',
				errorType: { InsufficientFunds: { balance: 10n } }
			});

			expect(toTipErrorType(err)).toBe(PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_INSUFFICIENT_FUNDS);
		});

		it('maps the ledger generic error without its message', () => {
			const err = new IcrcTransferError({
				errorType: { GenericError: { message: 'anything', error_code: 1n } }
			});

			expect(toTipErrorType(err)).toBe(PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_GENERIC_ERROR);
		});

		it.each([
			{ label: 'a transport failure', err: new Error('Call failed: request id 0x1234') },
			{ label: 'a variant this build does not know', err: { SomethingNew: null } },
			{ label: 'a key inherited from Object', err: { constructor: null } },
			{ label: 'an empty object', err: {} },
			{ label: 'a string', err: 'boom' },
			{ label: 'undefined', err: undefined },
			{ label: 'null', err: null }
		])('falls back to unknown for $label', ({ err }) => {
			expect(toTipErrorType(err)).toBe(PLAUSIBLE_EVENT_TIP_ERROR_TYPES.UNKNOWN);
		});
	});
});
