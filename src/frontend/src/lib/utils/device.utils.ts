import { isNode } from '$lib/utils/env.utils';
import { nonNullish } from '@dfinity/utils';

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
