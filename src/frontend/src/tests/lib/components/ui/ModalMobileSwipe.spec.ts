import Modal from '$lib/components/ui/Modal.svelte';
import { mobilePageSwipe } from '$lib/services/mobile-page-swipe.services';
import { busy } from '$lib/stores/busy.store';
import { createMockSnippet, mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

vi.mock('$lib/constants/mobile.constants', () => ({ MOBILE_SHELL: true }));
vi.mock('$lib/services/mobile-page-swipe.services', () => ({ mobilePageSwipe: vi.fn() }));
vi.mock('$lib/services/mobile-sheet.services', () => ({ nativeSheet: vi.fn() }));

describe('mobile page Back', () => {
	it.each([
		{ mobilePresentation: 'fullScreen', mobileSwipeBack: true, enabled: true },
		{ mobilePresentation: 'fullScreen', mobileSwipeBack: false, enabled: false },
		{ mobilePresentation: 'sheet', mobileSwipeBack: true, enabled: false },
		{
			mobilePresentation: 'fullScreen',
			mobileSwipeBack: true,
			disablePointerEvents: true,
			enabled: false
		},
		{
			mobilePresentation: 'fullScreen',
			mobileSwipeBack: true,
			showCloseButton: false,
			enabled: false
		}
	] as const)('only enables eligible full pages: %j', ({ enabled, ...props }) => {
		vi.clearAllMocks();
		const close = vi.fn();
		render(Modal, {
			props: { ...props, onClose: close, title: createMockSnippet('Send'), children: mockSnippet }
		});
		const [[, options]] = vi.mocked(mobilePageSwipe).mock.calls;

		expect(options?.enabled ?? false).toBe(enabled);

		busy.start();
		options?.onBack();

		expect(close).not.toHaveBeenCalled();

		busy.stop();
	});
});
