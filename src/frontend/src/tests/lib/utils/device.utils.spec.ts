import { isDesktop, isIOS, isIPad, isMobile, isPWAStandalone } from '$lib/utils/device.utils';
import type * as EnvUtils from '$lib/utils/env.utils';

// isIPad/isIOS short-circuit via isNode(), which is true under the Node test
// runtime; mock it to false so the user-agent branching is actually exercised.
vi.mock('$lib/utils/env.utils', async (importOriginal) => ({
	...(await importOriginal<typeof EnvUtils>()),
	isNode: () => false
}));

const mockNavigator = (value: object) =>
	Object.defineProperty(window, 'navigator', { writable: true, value });

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

	describe('isPWAStandalone', () => {
		it('should return true for PWA standalone mode checking the navigator', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					standalone: true
				}
			});

			expect(isPWAStandalone()).toBeTruthy();
		});

		it('should return false for browser mode checking the navigator', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					standalone: false
				}
			});

			expect(isPWAStandalone()).toBeFalsy();
		});

		it('should return true for PWA standalone mode checking the match media', () => {
			Object.defineProperties(window, {
				navigator: {
					writable: true,
					value: {}
				},
				matchMedia: {
					writable: true,
					value: vi.fn().mockImplementation((query) => ({
						matches: query === '(display-mode: standalone)'
					}))
				}
			});

			expect(isPWAStandalone()).toBeTruthy();
		});

		it('should return false for browser mode checking the match media', () => {
			Object.defineProperties(window, {
				navigator: {
					writable: true,
					value: {}
				},
				matchMedia: {
					writable: true,
					value: vi.fn().mockImplementation((query) => ({
						matches: query === '(display-mode: browser)'
					}))
				}
			});

			expect(isPWAStandalone()).toBeFalsy();
		});
	});

	describe('isIPad', () => {
		it('should return true for an iOS 12 and below iPad user agent', () => {
			mockNavigator({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X)' });

			expect(isIPad()).toBeTruthy();
		});

		it('should return true for an iPadOS 13+ "Macintosh" user agent reported as mobile', () => {
			mockNavigator({
				userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
				userAgentData: { mobile: true }
			});

			expect(isIPad()).toBeTruthy();
		});

		it('should return false for a desktop "Macintosh" user agent not reported as mobile', () => {
			mockNavigator({
				userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
				userAgentData: { mobile: false }
			});

			expect(isIPad()).toBeFalsy();
		});

		it('should return false for a non-Apple user agent', () => {
			mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });

			expect(isIPad()).toBeFalsy();
		});
	});

	describe('isIOS', () => {
		it('should return true for an iPhone user agent', () => {
			mockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });

			expect(isIOS()).toBeTruthy();
		});

		it('should return true for an iPod user agent', () => {
			mockNavigator({ userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)' });

			expect(isIOS()).toBeTruthy();
		});

		it('should return true for an iPadOS 13+ device (via isIPad)', () => {
			mockNavigator({
				userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
				userAgentData: { mobile: true }
			});

			expect(isIOS()).toBeTruthy();
		});

		it('should return false for a non-iOS user agent', () => {
			mockNavigator({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' });

			expect(isIOS()).toBeFalsy();
		});
	});
});
