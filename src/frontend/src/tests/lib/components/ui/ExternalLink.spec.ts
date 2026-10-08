import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
import { trackEvent } from '$lib/services/analytics.services';
import type { TrackEventParams } from '$lib/types/analytics';
import * as deviceUtils from '$lib/utils/device.utils';
import { fireEvent, render } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('ExternalLink', () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
	});

	// This is the contract the Learn more wire-ups in `buildLearnMoreEvent`
	// rely on. Asserting it once here means every call site that passes a
	// `trackEvent` prop is covered by construction — no per-component test
	// needed. See `analytics.service.spec.ts` for payload-shape coverage of
	// the helper itself.
	it('fires the trackEvent params verbatim when the link is clicked', async () => {
		const params: TrackEventParams = {
			name: 'open_documentation',
			metadata: {
				event_context: 'learn_more',
				event_key: 'link',
				event_value: 'https://example.com/docs',
				source_location: 'lock',
				source_path: 'lock / Learn more'
			}
		};

		const { getByRole } = render(ExternalLink, {
			props: {
				href: 'https://example.com/docs',
				ariaLabel: 'Learn more',
				trackEvent: params
			}
		});

		await fireEvent.click(getByRole('link', { name: 'Learn more' }));

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith(params);
	});

	it('does not fire trackEvent when the prop is not set', async () => {
		const { getByRole } = render(ExternalLink, {
			props: {
				href: 'https://example.com/docs',
				ariaLabel: 'Plain link'
			}
		});

		await fireEvent.click(getByRole('link', { name: 'Plain link' }));

		expect(trackEvent).not.toHaveBeenCalled();
	});

	describe('popup in a desktop PWA', () => {
		const href = 'https://solscan.io/tx/abc';

		const renderLink = (props: { trackEvent?: TrackEventParams } = {}) =>
			render(ExternalLink, {
				props: { href, ariaLabel: 'Explorer', ...props }
			}).getByRole('link', { name: 'Explorer' });

		let openSpy: MockInstance<typeof window.open>;

		beforeEach(() => {
			openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
			vi.spyOn(deviceUtils, 'isDesktop').mockReturnValue(true);
			vi.spyOn(deviceUtils, 'isPWAStandalone').mockReturnValue(true);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('opens the link in a popup window and cancels the default navigation', async () => {
			const notCancelled = await fireEvent.click(renderLink());

			expect(notCancelled).toBeFalsy();
			expect(openSpy).toHaveBeenCalledExactlyOnceWith(
				href,
				'_blank',
				expect.stringMatching(/width=1024.*height=768.*noopener, noreferrer$/)
			);
		});

		it('still fires the trackEvent params', async () => {
			const params: TrackEventParams = { name: 'open_explorer' };

			await fireEvent.click(renderLink({ trackEvent: params }));

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith(params);
			expect(openSpy).toHaveBeenCalledOnce();
		});

		it.each(['metaKey', 'ctrlKey', 'shiftKey', 'altKey'])(
			'keeps the browser default on a %s click',
			async (modifier) => {
				const notCancelled = await fireEvent.click(renderLink(), { [modifier]: true });

				expect(notCancelled).toBeTruthy();
				expect(openSpy).not.toHaveBeenCalled();
			}
		);

		it('keeps the new-tab behaviour in a desktop browser tab', async () => {
			vi.spyOn(deviceUtils, 'isPWAStandalone').mockReturnValue(false);

			const notCancelled = await fireEvent.click(renderLink());

			expect(notCancelled).toBeTruthy();
			expect(openSpy).not.toHaveBeenCalled();
		});

		it('keeps the new-tab behaviour in a mobile PWA', async () => {
			vi.spyOn(deviceUtils, 'isDesktop').mockReturnValue(false);

			const notCancelled = await fireEvent.click(renderLink());

			expect(notCancelled).toBeTruthy();
			expect(openSpy).not.toHaveBeenCalled();
		});
	});
});
