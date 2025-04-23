import { isDesktop, isMobile } from '$lib/utils/device.utils';

describe('device.utils', () => {
	describe('isMobile', () => {
		it('should return true for mobile device checking the navigator', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgentData: {
						mobile: true
					}
				}
			});

			expect(isMobile()).toBeTruthy();
		});

		it('should return false for desktop device checking the navigator', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgentData: {
						mobile: false
					}
				}
			});

			expect(isMobile()).toBeFalsy();
		});

		it('should return true for mobile device checking the match media', () => {
			Object.defineProperties(window, {
				navigator: {
					writable: true,
					value: {}
				},
				matchMedia: {
					writable: true,
					value: vi.fn().mockImplementation((query) => ({
						matches: query === '(any-pointer:coarse)'
					}))
				}
			});

			expect(isMobile()).toBeTruthy();
		});

		it('should return false for desktop device checking the match media', () => {
			Object.defineProperties(window, {
				navigator: {
					writable: true,
					value: {}
				},
				matchMedia: {
					writable: true,
					value: vi.fn().mockImplementation((query) => ({
						matches: query === '(any-pointer:fine)'
					}))
				}
			});

			expect(isMobile()).toBeFalsy();
		});
	});

	describe('isDesktop', () => {
		it('should return false for mobile device checking the navigator', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgentData: {
						mobile: true
					}
				}
			});

			expect(isDesktop()).toBeFalsy();
		});

		it('should return true for desktop device checking the navigator', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgentData: {
						mobile: false
					}
				}
			});

			expect(isDesktop()).toBeTruthy();
		});

		it('should return false for mobile device checking the match media', () => {
			Object.defineProperties(window, {
				navigator: {
					writable: true,
					value: {}
				},
				matchMedia: {
					writable: true,
					value: vi.fn().mockImplementation((query) => ({
						matches: query === '(any-pointer:coarse)'
					}))
				}
			});

			expect(isDesktop()).toBeFalsy();
		});

		it('should return true for desktop device checking the match media', () => {
			Object.defineProperties(window, {
				navigator: {
					writable: true,
					value: {}
				},
				matchMedia: {
					writable: true,
					value: vi.fn().mockImplementation((query) => ({
						matches: query === '(any-pointer:fine)'
					}))
				}
			});

			expect(isDesktop()).toBeTruthy();
		});
	});
});
