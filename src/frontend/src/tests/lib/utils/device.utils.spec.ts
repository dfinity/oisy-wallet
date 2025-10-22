import { isDesktop, isIos, isMobile, isPWAStandalone } from '$lib/utils/device.utils';

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

	describe('isIos', () => {
		it('should return true for iPad', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgent:
						'Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
				}
			});

			expect(isIos()).toBeTruthy();
		});

		it('should return true for iPhone', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgent:
						'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
				}
			});

			expect(isIos()).toBeTruthy();
		});

		it('should return true for iPod', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgent:
						'Mozilla/5.0 (iPod; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
				}
			});

			expect(isIos()).toBeTruthy();
		});

		it('should return true for iPads that pretend to be Macs', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgent:
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
					platform: 'MacIntel',
					maxTouchPoints: 2
				}
			});

			expect(isIos()).toBeTruthy();
		});

		it('should return false for Macs', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgent:
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
					platform: 'MacIntel',
					maxTouchPoints: 0
				}
			});

			expect(isIos()).toBeFalsy();
		});

		it('should return false for any other device', () => {
			Object.defineProperty(window, 'navigator', {
				writable: true,
				value: {
					userAgent:
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36'
				}
			});

			expect(isIos()).toBeFalsy();
		});
	});
});
