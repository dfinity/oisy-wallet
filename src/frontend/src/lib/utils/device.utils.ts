import { nonNullish } from '@dfinity/utils';

interface UserAgentData {
	mobile?: boolean;
}

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
