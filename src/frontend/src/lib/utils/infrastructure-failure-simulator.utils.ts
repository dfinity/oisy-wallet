import { browser } from '$app/environment';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import {
	HttpErrorCode,
	HttpFetchErrorCode,
	ProtocolError,
	TimeoutWaitingForResponseErrorCode,
	TransportError
} from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';

/**
 * DEMO ONLY — this file ships on a branch that is NOT intended to be merged.
 *
 * Forces a chosen Internet-Computer transport failure so the unreachable-network handling
 * (PR #13628) can be reproduced end-to-end without an actual outage: the full-page
 * `InfrastructureErrorPage` for the blocking profile load, the calm connection toast for
 * background loads, the kept session, and the `exceptional_error` Plausible event.
 *
 * The error is thrown from *inside* the API call, so it travels the exact real path —
 * `isNetworkUnreachableError` classifies it, then the service decides page vs. toast. A mode
 * that the classifier is supposed to reject therefore proves the negative case just as
 * genuinely as the positive ones do.
 *
 * Only active locally or on a test/staging build (never on the `ic` production build), and
 * only when explicitly opted in via:
 *   - URL query params: `?simulate_infra_failure=offline&simulate_infra_failure_target=profile`
 *   - or localStorage:  `localStorage.setItem('OISY_SIMULATE_INFRA_FAILURE', 'offline')`
 *
 * The query param wins over localStorage. Clear it (or set it to anything unrecognised) to
 * disable — which is also how the recovery path is tested, since the store resets on the next
 * successful load.
 */

/**
 * The two outage shapes agent-js actually produces, the shape that survives a worker
 * boundary, and the two the classifier must *not* treat as an outage.
 */
export type SimulatedInfrastructureFailureMode =
	'offline' | 'gateway' | 'rate_limit' | 'worker' | 'timeout' | 'unknown';

const SIMULATED_INFRASTRUCTURE_FAILURE_MODES: SimulatedInfrastructureFailureMode[] = [
	'offline',
	'gateway',
	'rate_limit',
	'worker',
	'timeout',
	'unknown'
];

/**
 * Which load to break. The profile is the *blocking* one, so when both break the page always
 * wins and the toast is never seen — which is why the target has to be selectable rather than
 * simply failing every call.
 */
export type SimulatedInfrastructureFailureTarget = 'profile' | 'rewards' | 'all';

const SIMULATED_INFRASTRUCTURE_FAILURE_TARGETS: SimulatedInfrastructureFailureTarget[] = [
	'profile',
	'rewards',
	'all'
];

const SIMULATE_INFRA_FAILURE_KEY = 'OISY_SIMULATE_INFRA_FAILURE';
const SIMULATE_INFRA_FAILURE_TARGET_KEY = 'OISY_SIMULATE_INFRA_FAILURE_TARGET';

// Reading the opt-in must never be able to throw: this runs inside a real API call, so a
// hardened browser profile that denies storage access — or a test environment whose
// `localStorage` is not the DOM one and has no `getItem` — would otherwise turn a demo switch
// into a genuine failure.
const readStorage = (key: string): string | null => {
	try {
		return localStorage.getItem(key) ?? null;
	} catch (_: unknown) {
		return null;
	}
};

const readOptIn = ({
	key,
	queryParam
}: {
	key: typeof SIMULATE_INFRA_FAILURE_KEY | typeof SIMULATE_INFRA_FAILURE_TARGET_KEY;
	queryParam: string;
}): string | undefined => {
	// Never simulate on production builds, in non-browser contexts, or when not opted in.
	if (!browser || !(LOCAL || STAGING)) {
		return undefined;
	}

	const fromQuery = new URLSearchParams(window.location.search).get(queryParam);

	return fromQuery ?? readStorage(key) ?? undefined;
};

const readSimulatedInfrastructureFailureMode = ():
	SimulatedInfrastructureFailureMode | undefined => {
	const value = readOptIn({
		key: SIMULATE_INFRA_FAILURE_KEY,
		queryParam: 'simulate_infra_failure'
	});

	return SIMULATED_INFRASTRUCTURE_FAILURE_MODES.find((mode) => mode === value);
};

// Defaults to `profile`: the full-page state is the headline behaviour of PR #13628, so the
// shortest possible URL should produce it.
const readSimulatedInfrastructureFailureTarget = (): SimulatedInfrastructureFailureTarget => {
	const value = readOptIn({
		key: SIMULATE_INFRA_FAILURE_TARGET_KEY,
		queryParam: 'simulate_infra_failure_target'
	});

	return SIMULATED_INFRASTRUCTURE_FAILURE_TARGETS.find((target) => target === value) ?? 'profile';
};

const buildSimulatedError = (mode: SimulatedInfrastructureFailureMode): unknown => {
	if (mode === 'offline') {
		// A rejected `fetch` — offline laptop, captive portal, DNS failure, backgrounded mobile
		// tab. `Load failed` is WebKit's wording, which is what users actually reported seeing.
		return TransportError.fromCode(new HttpFetchErrorCode(new TypeError('Load failed')));
	}

	if (mode === 'gateway') {
		// A boundary node that answers but cannot serve. This is a `Protocol` kind, not a
		// `Transport` one — the case a check on `kind` alone would have missed.
		return ProtocolError.fromCode(new HttpErrorCode(503, 'Service Unavailable', []));
	}

	if (mode === 'rate_limit') {
		// A boundary node refusing to route us: as unreachable as one that is down.
		return ProtocolError.fromCode(new HttpErrorCode(429, 'Too Many Requests', []));
	}

	if (mode === 'worker') {
		// An error that lost its prototype crossing a worker `postMessage` boundary, so
		// `instanceof AgentError` no longer holds and only the message marker is left to match.
		return new Error('Failed to fetch HTTP request: Load failed');
	}

	if (mode === 'timeout') {
		// Deliberately NOT an outage: as likely to mean a slow canister. Expected to fall through
		// to the pre-existing behaviour, not to the new page.
		return ProtocolError.fromCode(
			new TimeoutWaitingForResponseErrorCode('Request timed out after 300000 ms')
		);
	}

	// `unknown` → a plain non-network failure, the control that must still toast and still sign
	// out on the blocking path.
	return new Error('Simulated non-network failure (demo)');
};

/**
 * Throws the configured simulated transport error, or does nothing when simulation is off or
 * aimed at a different load. Call this at the start of an API call so the thrown error follows
 * the exact same code path a real unreachable network would.
 */
export const simulateInfrastructureFailureIfEnabled = (
	target: Exclude<SimulatedInfrastructureFailureTarget, 'all'>
) => {
	const mode = readSimulatedInfrastructureFailureMode();

	if (isNullish(mode)) {
		return;
	}

	const configuredTarget = readSimulatedInfrastructureFailureTarget();

	if (configuredTarget !== 'all' && configuredTarget !== target) {
		return;
	}

	throw buildSimulatedError(mode);
};
