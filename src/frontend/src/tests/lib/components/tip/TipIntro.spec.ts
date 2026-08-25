import TipIntro from '$lib/components/tip/TipIntro.svelte';
import {
	TIP_INTRO_GET_STARTED_BUTTON,
	TIP_INTRO_HISTORY_BUTTON
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TipIntro', () => {
	const getStartedSelector = `button[data-tid=${TIP_INTRO_GET_STARTED_BUTTON}]`;
	const historySelector = `button[data-tid=${TIP_INTRO_HISTORY_BUTTON}]`;

	it('renders the heading, the body and both footer actions', () => {
		const { container, getByText } = render(TipIntro, {
			props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
		});

		expect(getByText(get(i18n).tip.text.intro_heading)).toBeInTheDocument();
		expect(getByText(get(i18n).tip.text.intro_body)).toBeInTheDocument();
		expect(container.querySelector(getStartedSelector)).toBeInTheDocument();
		expect(container.querySelector(historySelector)).toBeInTheDocument();
	});

	it('promises that unclaimed funds lapse rather than being refunded', () => {
		// The design's copy said unclaimed tokens "are automatically returned to
		// your available balance", which the no-custody model makes untrue: nothing
		// ever leaves the wallet, so nothing is returned. Asserted because it is a
		// claim about where someone's money goes, and a plausible-sounding
		// regression would be easy to reintroduce from the mock.
		const { getByText } = render(TipIntro, {
			props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
		});
		const body = get(i18n).tip.text.intro_body;

		expect(getByText(body)).toBeInTheDocument();
		expect(body).not.toMatch(/refund|returned/i);
		expect(body).toMatch(/never leave your wallet/i);
	});
});
