import { AUTH_MAX_TIME_TO_LIVE } from '$lib/constants/app.constants';
import type {} from '$lib/types/mobile-host';

// Presentation/runtime selection, not a trust signal. Native validates every call.
// Even an unsupported host must fail closed rather than load browser credentials.
export let MOBILE_SHELL = typeof window !== 'undefined' && window.__oisyHost !== undefined;

// Workers have no Window. Their parent selects this runtime before installing a
// private MessagePort session; they never fall back to browser auth storage.
export const enableMobileWorkerRuntime = (): void => {
	if (typeof window !== 'undefined' || typeof globalThis.postMessage !== 'function') {
		throw new Error('Worker runtime required');
	}
	MOBILE_SHELL = true;
};

// Use the web sign-in lifetime; AuthSession.duration must match in the native host.
// Grants keep the original sign-in deadline.
export const MOBILE_SESSION_DURATION_MS = Number(AUTH_MAX_TIME_TO_LIVE) / 1_000_000;
