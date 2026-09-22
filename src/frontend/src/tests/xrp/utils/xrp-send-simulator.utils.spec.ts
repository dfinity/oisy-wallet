import * as appConstants from '$lib/constants/app.constants';
import {
	shouldSimulateXrpLookupFailure,
	shouldSimulateXrpSubmitSkipped,
	simulatedXrpSendMode
} from '$xrp/utils/xrp-send-simulator.utils';

describe('xrp-send-simulator.utils', () => {
	const onStaging = () => vi.spyOn(appConstants, 'STAGING', 'get').mockReturnValue(true);

	const setQuery = (search: string) => {
		Object.defineProperty(window, 'location', {
			value: { search },
			writable: true
		});
	};

	// Stubbed rather than used: this environment's `localStorage` is Node's own, which has no
	// `setItem`/`removeItem`, so a spec leaning on the real one only passes in CI.
	let store: Record<string, string>;

	const setFlag = (value: string) => {
		store.OISY_SIMULATE_XRP_SEND = value;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		setQuery('');

		store = {};

		vi.stubGlobal('localStorage', {
			getItem: (key: string) => store[key] ?? null
		});
	});

	it('is off when nothing is opted in', () => {
		onStaging();

		expect(simulatedXrpSendMode()).toBeUndefined();
		expect(shouldSimulateXrpLookupFailure()).toBeFalsy();
		expect(shouldSimulateXrpSubmitSkipped()).toBeFalsy();
	});

	it.each(['lookup_fails', 'no_submit'])('reads %s from the query param', (mode) => {
		onStaging();
		setQuery(`?simulate_xrp_send=${mode}`);

		expect(simulatedXrpSendMode()).toBe(mode);
	});

	it.each(['lookup_fails', 'no_submit'])('reads %s from localStorage', (mode) => {
		onStaging();
		setFlag(mode);

		expect(simulatedXrpSendMode()).toBe(mode);
	});

	it('lets the query param win over localStorage', () => {
		onStaging();
		setFlag('no_submit');
		setQuery('?simulate_xrp_send=lookup_fails');

		expect(simulatedXrpSendMode()).toBe('lookup_fails');
	});

	// Anything unrecognised disables it, which is also how the flag is cleared.
	it.each(['', 'yes', 'true', 'LOOKUP_FAILS', 'lookup_fails '])(
		'ignores the unrecognised value %j',
		(value) => {
			onStaging();
			setFlag(value);

			expect(simulatedXrpSendMode()).toBeUndefined();
		}
	);

	// The one case that must never simulate, however the flag is set.
	it('stays off on a production build', () => {
		vi.spyOn(appConstants, 'LOCAL', 'get').mockReturnValue(false);
		vi.spyOn(appConstants, 'STAGING', 'get').mockReturnValue(false);
		setFlag('lookup_fails');
		setQuery('?simulate_xrp_send=lookup_fails');

		expect(simulatedXrpSendMode()).toBeUndefined();
		expect(shouldSimulateXrpLookupFailure()).toBeFalsy();
		expect(shouldSimulateXrpSubmitSkipped()).toBeFalsy();
	});

	it('routes each mode to exactly one injection point', () => {
		onStaging();

		setFlag('lookup_fails');

		expect(shouldSimulateXrpLookupFailure()).toBeTruthy();
		expect(shouldSimulateXrpSubmitSkipped()).toBeFalsy();

		setFlag('no_submit');

		expect(shouldSimulateXrpLookupFailure()).toBeFalsy();
		expect(shouldSimulateXrpSubmitSkipped()).toBeTruthy();
	});

	// Reading the opt-in runs inside a real send, so a browser that denies storage must disable the
	// simulator rather than break the send.
	it('stays off when localStorage throws', () => {
		onStaging();
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('denied');
			}
		});

		expect(simulatedXrpSendMode()).toBeUndefined();
	});
});
