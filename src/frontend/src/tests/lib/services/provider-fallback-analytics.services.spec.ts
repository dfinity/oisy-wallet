import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { trackProviderFallback } from '$lib/services/provider-fallback-analytics.services';
import type { MockInstance } from 'vitest';

describe('trackProviderFallback', () => {
	let track: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	it('should emit the call, why it was handed over, the network and the outcome', () => {
		trackProviderFallback({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.SUBMISSION,
			trigger: 'timeout',
			network: 'mainnet',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		});

		expect(track).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.PROVIDER_FALLBACK,
			metadata: {
				event_context: 'providers',
				event_subcontext: 'submission',
				event_trigger: 'timeout',
				event_key: 'network',
				event_value: 'mainnet',
				result_status: 'success'
			}
		});
	});

	it('should keep one event name for every call handed over', () => {
		// How often each call fails is only comparable if they are the same event, told apart by
		// their subcontext.
		Object.values(PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS).forEach((operation) =>
			trackProviderFallback({
				operation,
				trigger: 'error',
				network: 'base',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
			})
		);

		const names = track.mock.calls.map(([{ name }]) => name);
		const subcontexts = track.mock.calls.map(([{ metadata }]) => metadata?.event_subcontext);

		expect(names).toEqual([
			PLAUSIBLE_EVENTS.PROVIDER_FALLBACK,
			PLAUSIBLE_EVENTS.PROVIDER_FALLBACK,
			PLAUSIBLE_EVENTS.PROVIDER_FALLBACK
		]);
		expect(subcontexts).toEqual(['submission', 'nonce', 'fee']);
	});

	it('should carry nothing that could tie the event to a wallet', () => {
		trackProviderFallback({
			operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.NONCE,
			trigger: 'error',
			network: 'mainnet',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		});

		const [[{ metadata }]] = track.mock.calls;

		// Pinned as the whole set, so that an address, a hash or an amount cannot be added without
		// this line changing with it.
		expect(Object.keys(metadata ?? {}).sort()).toEqual([
			'event_context',
			'event_key',
			'event_subcontext',
			'event_trigger',
			'event_value',
			'result_status'
		]);
	});
});
