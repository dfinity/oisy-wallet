import CyclesTopUpButton from '$icp/components/cycles-top-up/CyclesTopUpButton.svelte';
import { unansweredCyclesTopUps } from '$icp/stores/cycles-top-up.store';
import {
	CYCLES_TOP_UP_BUTTON,
	CYCLES_TOP_UP_CANISTER_INPUT,
	CYCLES_TOP_UP_REVIEW
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import * as cyclesTopUpAnalytics from '$lib/services/cycles-top-up-analytics.services';
import { HERO_CONTEXT_KEY, initHeroContext } from '$lib/stores/hero.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipalText2 } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('CyclesTopUpButton', () => {
	const heroContext = ({ outflowActionsDisabled }: { outflowActionsDisabled: boolean }) => {
		const context = initHeroContext();

		context.loading.set(false);
		context.outflowActionsDisabled.set(outflowActionsDisabled);

		return new Map<symbol, unknown>([[HERO_CONTEXT_KEY, context]]);
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		modalStore.close();
		unansweredCyclesTopUps.set({});

		vi.spyOn(cyclesTopUpAnalytics, 'trackCyclesTopUp').mockImplementation(() => undefined);
	});

	it('shows Top up with its label', () => {
		const { getByTestId } = render(CyclesTopUpButton, {
			props: { token: mockTcyclesToken },
			context: heroContext({ outflowActionsDisabled: false })
		});

		const button = getByTestId(CYCLES_TOP_UP_BUTTON);

		expect(button).toBeEnabled();
		expect(button).toHaveTextContent(en.cycles_top_up.text.top_up);
		expect(button).toHaveAttribute('aria-label', en.cycles_top_up.text.title);
	});

	// It spends TCYCLES, so without a balance it is off, as Send is.
	it('is disabled while the page’s outflow actions are disabled', () => {
		const { getByTestId } = render(CyclesTopUpButton, {
			props: { token: mockTcyclesToken },
			context: heroContext({ outflowActionsDisabled: true })
		});

		expect(getByTestId(CYCLES_TOP_UP_BUTTON)).toBeDisabled();
	});

	it('opens the Top up modal', async () => {
		const { getByTestId } = render(CyclesTopUpButton, {
			props: { token: mockTcyclesToken },
			context: heroContext({ outflowActionsDisabled: false })
		});

		await fireEvent.click(getByTestId(CYCLES_TOP_UP_BUTTON));

		expect(get(modalStore)?.type).toBe('cycles-top-up');
		expect(getByTestId(CYCLES_TOP_UP_CANISTER_INPUT)).toBeInTheDocument();
	});

	describe('with an unanswered top-up', () => {
		const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';

		const unanswered = {
			canisterId: canister,
			amount: 1_500_000_000_000n,
			createdAt: 1_000_000_000n
		};

		beforeEach(() => {
			vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		});

		// A Max top-up that went through without an answer leaves nothing to spend, and the
		// resend is still how its outcome gets settled.
		it('opens that top-up on Review even without a balance', async () => {
			unansweredCyclesTopUps.set({
				[mockIdentity.getPrincipal().toText()]: { request: unanswered, send: Symbol() }
			});

			const { getByTestId } = render(CyclesTopUpButton, {
				props: { token: mockTcyclesToken },
				context: heroContext({ outflowActionsDisabled: true })
			});

			const button = getByTestId(CYCLES_TOP_UP_BUTTON);

			expect(button).toBeEnabled();

			await fireEvent.click(button);

			await waitFor(() => {
				expect(getByTestId(CYCLES_TOP_UP_REVIEW)).toHaveTextContent(canister);
			});
		});

		it("stays disabled without a balance for another principal's top-up", () => {
			unansweredCyclesTopUps.set({ [mockPrincipalText2]: { request: unanswered, send: Symbol() } });

			const { getByTestId } = render(CyclesTopUpButton, {
				props: { token: mockTcyclesToken },
				context: heroContext({ outflowActionsDisabled: true })
			});

			expect(getByTestId(CYCLES_TOP_UP_BUTTON)).toBeDisabled();
		});
	});
});
