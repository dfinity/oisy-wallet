import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
import { trackEvent } from '$lib/services/analytics.services';
import type { TrackEventParams } from '$lib/types/analytics';
import { fireEvent, render } from '@testing-library/svelte';

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
});
