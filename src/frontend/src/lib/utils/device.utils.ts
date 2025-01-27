import { nonNullish } from '@dfinity/utils';

export const isMobile = () => {
	if ('userAgentData' in navigator && nonNullish(navigator.userAgentData)) {
		const userAgentData: any = navigator.userAgentData;
		return userAgentData.mobile;
	}
	const isTouchScreen = window.matchMedia('(any-pointer:coarse)').matches;
	return isTouchScreen;
};

export const isDesktop = () => {
	return !isMobile();
};
