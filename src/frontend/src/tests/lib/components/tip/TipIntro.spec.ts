import type { MyTip } from '$declarations/backend/backend.did';
import TipIntro from '$lib/components/tip/TipIntro.svelte';
import {
	TIP_INTRO_GET_STARTED_BUTTON,
	TIP_INTRO_HISTORY_BUTTON
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { tipsStore } from '$lib/stores/tips.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
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

	it('says the amount stays in the wallet rather than being refunded', () => {
		// The design's copy said unclaimed tokens "are automatically returned to
		// your available balance", which the no-custody model makes untrue: nothing
		// ever leaves the wallet, so nothing is returned. Asserted because it is a
		// claim about where someone's money goes, and a plausible-sounding
		// regression would be easy to reintroduce from the mock.
		//
		// Matched on "stays in your wallet" rather than the old "never leave your
		// wallet": the sentence changed because the previous one also claimed the
		// *funds* never leave, which contradicted the reserve fee itemised on the
		// create form — that fee is spent at `icrc2_approve` whether anyone claims
		// or not. What is asserted is the part that was always true and is the
		// point of the line: the amount does not move.
		const { getByText } = render(TipIntro, {
			props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
		});
		const body = get(i18n).tip.text.intro_body;

		expect(getByText(body)).toBeInTheDocument();
		expect(body).not.toMatch(/refund|returned/i);
		expect(body).toMatch(/stays in your wallet/i);
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

		it('never leaves a label standing over a blank', () => {
			// What this closes: `fiat` returns nothing both for an empty group and for
			// one whose tokens have no rate, so a label could sit over nothing at all.
			// Reported for a sender with a claimed tip and no open one — and the worse
			// case is a sender whose only tip failed, who lights the block through
			// `hasAny` with both of these columns empty.
			tipsStore.set([tip({ Failed: null })]);

			const { getByText, getAllByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			expect(getByText(get(i18n).tip.text.overview_open)).toBeInTheDocument();
			expect(getByText(get(i18n).tip.text.overview_claimed)).toBeInTheDocument();

			// Both figures say so rather than showing nothing.
			expect(getAllByText(get(i18n).tip.text.overview_none)).toHaveLength(2);
		});

		it('falls back to the count when a group has no rate to price it', () => {
			// The half that matters beyond tidiness. Without a rate the sum is zero, so
			// a sender with an open tip in a newly listed or local token saw a blank
			// under "Waiting to be claimed" — readable as nothing being out there,
			// while their money was reserved. No exchange rate is mocked here, which is
			// exactly that situation.
			tipsStore.set([tip({ Reserved: null }), tip({ Claimed: null })]);

			const { getAllByText, queryByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			const { text } = get(i18n).tip;

			// One waiting and one claimed, neither priceable — so both columns fall
			// back to their count rather than one of them going blank.
			expect(
				getAllByText(replacePlaceholders(text.overview_count_one, { $count: '1' }))
			).toHaveLength(2);

			// Not "None" — there is something waiting, we just cannot price it.
			expect(queryByText(text.overview_none)).toBeNull();
		});

		it('stays away when every tip has already lapsed', () => {
			// Nothing moved and nothing is held, so there is nothing to report.
			tipsStore.set([tip({ Expired: null }), tip({ Cancelled: null })]);

			const { queryByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			expect(queryByText(get(i18n).tip.text.overview_window)).toBeNull();
		});

		it('says nothing about attention when nothing needs it', () => {
			tipsStore.set([tip({ Claimed: null })]);

			const { getByText, queryByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			expect(getByText(get(i18n).tip.text.overview_window)).toBeInTheDocument();
			expect(queryByText(get(i18n).tip.text.overview_failed)).toBeNull();
		});

		it('reports the sums, not a tally', () => {
			// Two large figures at the top of the intro read as the subject of the
			// screen. What a sender wants from this box is how much is still out
			// there; the count is one tap away in History, where each tip is a row.
			tipsStore.set([tip({ Reserved: null }), tip({ Reserved: null })]);

			const { getByText, queryByText } = render(TipIntro, {
				props: { onGetStarted: vi.fn(), onViewHistory: vi.fn() }
			});

			expect(getByText(get(i18n).tip.text.overview_open)).toBeInTheDocument();

			// The count stood alone in its own element, so an exact-text match is
			// what tells us it is gone rather than merely restyled.
			expect(queryByText('2')).toBeNull();
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
