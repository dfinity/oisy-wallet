import { browser } from '$app/environment';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
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
 * Reproduces the failure paths that the error-handling work added, without needing the real
 * failure — neither of which can be provoked in a deployed environment:
 *
 * - **PR #13628, an unreachable Internet Computer**: the full-page `InfrastructureErrorPage`
 *   for the blocking profile load, the calm connection toast for background loads, the kept
 *   session, and the `exceptional_error` event.
 * - **PR #13636, a chain's address failing to derive**: the aggregated deduplicated toast, the
 *   wallet staying usable on the chains that did derive, `n/a` in place of an endless skeleton,
 *   and the `app_error` event. Derivation is local and deterministic, so a real failure needs
 *   an actual `ic-pub-key` bug.
 *
 * The failure is injected *inside* the call that fails for real, so it travels the exact real
 * path rather than forcing a store: for #13628 `isNetworkUnreachableError` classifies the error
 * and the service picks page vs. toast; for #13636 the throw lands in `loadTokenAddress`'s own
 * catch. A mode the code is supposed to *reject* therefore proves the negative case just as
 * genuinely as the positive ones do.
 *
 * Only active locally or on a test/staging build (never on the `ic` production build), and
 * only when explicitly opted in via:
 *   - URL query params: `?simulate_infra_failure=offline&simulate_infra_failure_target=profile`
 *   - or localStorage:  `localStorage.setItem('OISY_SIMULATE_INFRA_FAILURE', 'offline')`
 *
 * The query param wins over localStorage. Clear it (or set it to anything unrecognised) to
 * disable — which is also how the recovery paths are tested, since both the infrastructure-error
 * store and `failedAddresses` clear themselves on the next successful load.
 */

/**
 * The two outage shapes agent-js actually produces, the shape that survives a worker boundary,
 * the two the classifier must *not* treat as an outage, and the two failure reasons
 * `loadTokenAddress` distinguishes.
 *
 * The address reasons are only meaningful against an address target; against `profile` or
 * `rewards` they behave like `unknown`, since there is no transport error to shape.
 */
export type SimulatedInfrastructureFailureMode =
	| 'offline'
	| 'gateway'
	| 'rate_limit'
	| 'worker'
	| 'timeout'
	| 'unknown'
	| 'derive_threw'
	| 'session_invalid';

const SIMULATED_INFRASTRUCTURE_FAILURE_MODES: SimulatedInfrastructureFailureMode[] = [
	'offline',
	'gateway',
	'rate_limit',
	'worker',
	'timeout',
	'unknown',
	'derive_threw',
	'session_invalid'
];

/**
 * Which load to break, as the simulator sees it at the call site.
 *
 * The addresses are per chain on purpose: the point of #13636 is that *one* chain failing leaves
 * the other two working, so a harness that could only fail all three would not exercise the fix.
 */
type SimulatedFailureCallSite =
	'profile' | 'rewards' | 'address_btc' | 'address_eth' | 'address_sol';

/**
 * Which load to break, as the user configures it. Adds two group values on top of the call
 * sites: `address` for all three chains — which is what exercises the toast aggregating them
 * into one line — and `all` for every wrapped call.
 *
 * The profile is the *blocking* load, so when it breaks alongside anything else the page always
 * wins and nothing else is observable. That is why the target has to be selectable rather than
 * the simulator simply failing every call.
 */
export type SimulatedInfrastructureFailureTarget = SimulatedFailureCallSite | 'address' | 'all';

const SIMULATED_INFRASTRUCTURE_FAILURE_TARGETS: SimulatedInfrastructureFailureTarget[] = [
	'profile',
	'rewards',
	'address_btc',
	'address_eth',
	'address_sol',
	'address',
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

// Resolves the two group values (`all`, `address`) against the concrete call site asking.
const matchesCallSite = ({
	configured,
	callSite
}: {
	configured: SimulatedInfrastructureFailureTarget;
	callSite: SimulatedFailureCallSite;
}): boolean => {
	if (configured === 'all') {
		return true;
	}

	if (configured === 'address') {
		return callSite.startsWith('address');
	}

	return configured === callSite;
};

// The active mode for this call site, or undefined when simulation is off or aimed elsewhere.
const activeMode = (
	callSite: SimulatedFailureCallSite
): SimulatedInfrastructureFailureMode | undefined => {
	const mode = readSimulatedInfrastructureFailureMode();

	if (isNullish(mode)) {
		return undefined;
	}

	return matchesCallSite({ configured: readSimulatedInfrastructureFailureTarget(), callSite })
		? mode
		: undefined;
};

/**
 * Throws the configured simulated transport error, or does nothing when simulation is off or
 * aimed at a different load. Call this at the start of an API call so the thrown error follows
 * the exact same code path a real unreachable network would.
 */
export const simulateInfrastructureFailureIfEnabled = (
	callSite: Extract<SimulatedFailureCallSite, 'profile' | 'rewards'>
) => {
	const mode = activeMode(callSite);

	if (isNullish(mode)) {
		return;
	}

	throw buildSimulatedError(mode);
};

// Matched on the network ID rather than its description, mirroring `addressSubcontext` in
// `address.services.ts`: anything that is not BTC or SOL is an EVM chain there too.
const addressCallSite = (networkId: NetworkId): SimulatedFailureCallSite =>
	networkId === BTC_MAINNET_NETWORK_ID
		? 'address_btc'
		: networkId === SOLANA_MAINNET_NETWORK_ID
			? 'address_sol'
			: 'address_eth';

/**
 * How `loadTokenAddress` should pretend to fail for this chain, if at all.
 *
 * Returned rather than thrown because the two reasons need to be injected at different points:
 * `session-invalid` is decided *before* deriving (and is the one case that still signs the user
 * out), while `derive-threw` has to happen inside the `try` so it lands in the real catch that
 * records the failed address and emits the `app_error` event.
 */
export const simulatedAddressFailure = (
	networkId: NetworkId
): 'session-invalid' | 'derive-threw' | undefined => {
	const mode = activeMode(addressCallSite(networkId));

	if (isNullish(mode)) {
		return undefined;
	}

	// Every other mode describes a transport error, which is meaningless for a local derivation —
	// so anything that is not explicitly the lost-session case is a derive throw.
	return mode === 'session_invalid' ? 'session-invalid' : 'derive-threw';
};
