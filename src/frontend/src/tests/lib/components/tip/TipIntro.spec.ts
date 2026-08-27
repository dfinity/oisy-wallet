import type { MyTip } from '$declarations/backend/backend.did';
import TipIntro from '$lib/components/tip/TipIntro.svelte';
import {
	TIP_INTRO_GET_STARTED_BUTTON,
	TIP_INTRO_HISTORY_BUTTON
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { tipsStore } from '$lib/stores/tips.store';
import { Principal } from '@icp-sdk/core/principal';
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

	describe('the overview', () => {
		beforeEach(() => {
			tipsStore.reset();
		});

		const tip = (status: MyTip['status']): MyTip => ({
			tip_id: `tip-${JSON.stringify(status)}`,
			ledger_canister_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
			amount: 500_000n,
			expires_at_ns: 1_800_000_000_000_000_000n,
			created_at_ns: 1_700_000_000_000_000_000n,
			status,
			message: [],
			claimed_by: [],
			last_claim_failure: []
		});

		it('stays away entirely for a first-time sender', () => {
			// The illustration and the pitch are for exactly this person. An empty
			// summary above them would be noise.
			const { queryByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			expect(queryByText(get(i18n).tip.text.overview_window)).toBeNull();
		});

		it('surfaces a stuck tip without the sender opening History', () => {
			// The reason this screen gained a summary at all.
			tipsStore.set([tip({ Failed: null })]);

			const { getByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			expect(getByText(get(i18n).tip.text.overview_failed)).toBeInTheDocument();
			expect(getByText(get(i18n).tip.text.overview_failed_hint)).toBeInTheDocument();
		});

		it('says nothing about attention when nothing needs it', () => {
			tipsStore.set([tip({ Claimed: null })]);

			const { getByText, queryByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			expect(getByText(get(i18n).tip.text.overview_window)).toBeInTheDocument();
			expect(queryByText(get(i18n).tip.text.overview_failed)).toBeNull();
		});

		it('takes the sender to History from the attention row', () => {
			// Which now opens with the failed tips at the top.
			tipsStore.set([tip({ Failed: null })]);

			const onViewHistory = vi.fn();
			const { getByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory }
			});

			getByText(get(i18n).tip.text.overview_failed).closest('button')?.click();

			expect(onViewHistory).toHaveBeenCalledOnce();
		});
	});
});
