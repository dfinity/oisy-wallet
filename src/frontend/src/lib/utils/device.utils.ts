import { nonNullish } from '@dfinity/utils';

interface UserAgentData {
	mobile?: boolean;
}

export const isMobile = () => {
	if ('userAgentData' in navigator && nonNullish(navigator.userAgentData)) {
		const userAgentData: UserAgentData = navigator.userAgentData;
		return nonNullish(userAgentData.mobile) && userAgentData.mobile;
	}
	const isTouchScreen = window.matchMedia('(any-pointer:coarse)').matches;
	return isTouchScreen;
};

export const isDesktop = () => !isMobile();
