import { PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR } from '$lib/enums/plausible';
import { infrastructureError } from '$lib/stores/infrastructure-error.store';
import { HttpFetchErrorCode, TransportError } from '@dfinity/agent';
import { get } from 'svelte/store';

describe('infrastructure-error.store', () => {
	beforeEach(() => {
		infrastructureError.reset();
	});

	it('should start empty, so the app renders itself and not the error page', () => {
		expect(get(infrastructureError)).toBeUndefined();
	});

	it('should record the failing operation and the error detail', () => {
		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
			err: TransportError.fromCode(new HttpFetchErrorCode(new TypeError('Load failed')))
		});

		expect(get(infrastructureError)).toEqual({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
			detail: expect.stringContaining('Failed to fetch HTTP request')
		});
	});

	// The detail is rendered on screen and lands in pasted support screenshots, so a per-request
	// identifier in it is noise at best.
	it('should strip the IC request ID from the detail', () => {
		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
			err: new Error('Call failed\nRequest ID: 0123456789abcdef\nStatus: rejected')
		});

		expect(get(infrastructureError)?.detail).not.toContain('0123456789abcdef');
	});

	it('should hold no detail when there is no error to describe', () => {
		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.REWARDS,
			err: undefined
		});

		expect(get(infrastructureError)).toEqual({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.REWARDS,
			detail: undefined
		});
	});

	it('should clear on reset, so a recovered session stops showing the page', () => {
		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
			err: new Error('Boom')
		});

		infrastructureError.reset();

		expect(get(infrastructureError)).toBeUndefined();
	});

	it('should replace a previous error rather than accumulate', () => {
		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.USER_PROFILE,
			err: new Error('First')
		});
		infrastructureError.set({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.REWARDS,
			err: new Error('Second')
		});

		expect(get(infrastructureError)).toEqual({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.REWARDS,
			detail: 'Second'
		});
	});
});
