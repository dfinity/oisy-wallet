import { isNode } from '$lib/utils/env.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

interface UserAgentData {
	mobile?: boolean;
}

const userAgent = (): string => navigator.userAgent;

export const isIPad = (): boolean => {
	if (isNode()) {
		return false;
	}

	const agent = userAgent();

	// iOS 12 and below
	if (/iPad/i.test(agent)) {
		return true;
	}

	// iOS 13+
	return /Macintosh/i.test(agent) && isMobile();
};

export const isIOS = (): boolean => {
	if (isNode()) {
		return false;
	}

	const agent = userAgent();

	return /iPhone|iPod/i.test(agent) || isIPad();
};

export const isMobile = (): boolean => {
	if ('userAgentData' in navigator && nonNullish(navigator.userAgentData)) {
		const { userAgentData } = navigator as { userAgentData: UserAgentData };
		return nonNullish(userAgentData.mobile) && userAgentData.mobile;
	}
	const isTouchScreen = window.matchMedia('(any-pointer:coarse)').matches;
	const isMouseScreen = window.matchMedia('(any-pointer:fine)').matches;
	return isTouchScreen && !isMouseScreen;
};

export const isDesktop = () => !isMobile();

export const isPWAStandalone = () => {
	if ('standalone' in navigator && nonNullish(navigator.standalone)) {
		return navigator.standalone;
	}

	return window.matchMedia('(display-mode: standalone)').matches;
};

// Upper bound for the shared wallet-worker pool on desktop. Wallet sync is I/O-bound, so a small
// pool is enough to parallelize the CPU-heavy candid decode / mapping across cores while keeping
// memory far below one dedicated worker per token. Raising it trades memory for first-load CPU
// throughput.
const WORKER_POOL_MAX_SIZE = 4;

// Size of the shared worker pool. iOS keeps a single shared worker (memory-constrained); desktop
// scales with available cores while leaving headroom for the main thread and the other workers.
export const workerPoolSize = (): number => {
	if (isIOS()) {
		return 1;
	}

	// No browser context (SSR / non-browser runtime) — reading `navigator` would throw. The worker
	// pool is never actually exercised there; return the full pool so any caller gets a valid size.
	if (typeof navigator === 'undefined') {
		return WORKER_POOL_MAX_SIZE;
	}

	const cores: number | undefined = navigator.hardwareConcurrency;

	if (isNullish(cores)) {
		return WORKER_POOL_MAX_SIZE;
	}

	return cores >= 2 ? Math.min(cores - 1, WORKER_POOL_MAX_SIZE) : 1;
};
