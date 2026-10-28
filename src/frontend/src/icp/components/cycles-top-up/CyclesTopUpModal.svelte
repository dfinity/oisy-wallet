<script lang="ts">
	import { isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import CyclesTopUpAmount from '$icp/components/cycles-top-up/CyclesTopUpAmount.svelte';
	import CyclesTopUpCanister from '$icp/components/cycles-top-up/CyclesTopUpCanister.svelte';
	import CyclesTopUpProgress from '$icp/components/cycles-top-up/CyclesTopUpProgress.svelte';
	import CyclesTopUpReview from '$icp/components/cycles-top-up/CyclesTopUpReview.svelte';
	import { topUpCanister } from '$icp/services/cycles-top-up.services';
	import { lastCyclesTopUps } from '$icp/stores/cycles-top-up.store';
	import type { CyclesTopUpRequest, CyclesTopUpResult } from '$icp/types/cycles-top-up';
	import type { IcToken } from '$icp/types/ic-token';
	import { parseCanisterId } from '$icp/utils/cycles-top-up.utils';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
	import { WizardStepsCyclesTopUp } from '$lib/enums/wizard-steps';
	import { trackCyclesTopUp } from '$lib/services/cycles-top-up-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';

	interface Props {
		// The page's TCYCLES token.
		token: IcToken;
	}

	let { token }: Props = $props();

	let canisterIdText = $state('');
	let sendAmount = $state<OptionAmount>();
	let progressStep = $state<ProgressStepsCyclesTopUp>(ProgressStepsCyclesTopUp.INITIALIZATION);
	let currentStep = $state<WizardStep<WizardStepsCyclesTopUp> | undefined>();
	let modal = $state<WizardModal<WizardStepsCyclesTopUp>>();

	// The principal this modal opened for. A sign-in in another tab can switch this tab's
	// identity without a reload, and the inputs, with any resend they hold, belong to this
	// principal: the modal closes rather than top up from another account.
	const openedFor = get(authIdentity)?.getPrincipal().toText();

	let signedInAsOther = $derived($authIdentity?.getPrincipal().toText() !== openedFor);

	// The signed-in principal's top-up that got no answer, kept until the page reloads, so a
	// later modal has it too.
	// Sending the same canister and amount again reuses its creation time, so the ledger
	// answers with the first one's block if it went through, and the top-up runs at most
	// once. The ledger keeps that for 24 hours; a resend after that stays unknown (below).
	let last = $derived(
		nonNullish($authIdentity) ? $lastCyclesTopUps[$authIdentity.getPrincipal().toText()] : undefined
	);

	let unanswered = $derived(isNullish(last?.outcome) ? last?.request : undefined);

	let canisterId = $derived(parseCanisterId(canisterIdText)?.toText());

	let amount = $derived(
		nonNullish(sendAmount) && !invalidAmount(sendAmount)
			? parseToken({ value: `${sendAmount}`, unitName: token.decimals })
			: undefined
	);

	// The top-up this modal opened on (below). Top up keeps resending it after an answer to it
	// arrived while this modal was open: the same canister and amount as a fresh request would
	// run a second withdrawal. A refusal or a refund settles it instead (below).
	let resumed = $state<CyclesTopUpRequest | undefined>();

	const isResumed = ({ createdAt, canisterId, amount }: CyclesTopUpRequest): boolean =>
		resumed?.createdAt === createdAt &&
		resumed.canisterId === canisterId &&
		resumed.amount === amount;

	let resendable = $derived(unanswered ?? resumed);

	let resendsUnanswered = $derived(
		nonNullish(resendable) && resendable.canisterId === canisterId && resendable.amount === amount
	);

	let steps = $derived<WizardSteps<WizardStepsCyclesTopUp>>([
		{
			name: WizardStepsCyclesTopUp.CANISTER,
			title: $i18n.cycles_top_up.text.title
		},
		{
			name: WizardStepsCyclesTopUp.AMOUNT,
			title: $i18n.cycles_top_up.text.title
		},
		{
			name: WizardStepsCyclesTopUp.REVIEW,
			title: $i18n.convert.text.review
		},
		{
			name: WizardStepsCyclesTopUp.TOPPING_UP,
			title: $i18n.cycles_top_up.text.title
		}
	]);

	onMount(() => trackCyclesTopUp({ step: 'open' }));

	// A top-up can answer after the modal is gone, closed when another identity signed in. The
	// outcome is still recorded for its sender and shown in a toast, but the modal's own steps
	// are skipped, and so is its closing, which would close any modal opened since.
	let destroyed = false;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => {
		destroyed = true;
		clearTimeout(closeTimer);
	});

	const close = () =>
		closeModal(() => {
			canisterIdText = '';
			sendAmount = undefined;
			progressStep = ProgressStepsCyclesTopUp.INITIALIZATION;
			currentStep = undefined;
		});

	$effect(() => {
		if (signedInAsOther) {
			close();
		}
	});

	const formatAmount = (value: bigint): string =>
		formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals });

	// A modal opened while the principal's last top-up has no answer starts on that top-up's
	// Review, so Top up resends it: once the first one went through, the Amount step's balance
	// check would refuse the same amount. Back leads to the usual steps, where any change is a
	// new request. The full-precision amount parses back to the stored one.
	let openedOnUnanswered = false;

	$effect(() => {
		if (openedOnUnanswered || isNullish(modal)) {
			return;
		}

		openedOnUnanswered = true;

		if (isNullish(unanswered)) {
			return;
		}

		resumed = unanswered;
		canisterIdText = unanswered.canisterId;
		sendAmount = formatAmount(unanswered.amount);

		const reviewIndex = steps.findIndex(({ name }) => name === WizardStepsCyclesTopUp.REVIEW);

		if (reviewIndex >= 0) {
			modal.set(reviewIndex);
		}
	});

	// The modal that sent the top-up, closed by leaving the page, may get its answer while this
	// one is open on it. A refusal or a refund settles the request then too, as an answer here
	// does: nothing is left to resend, and the next top-up is a new request.
	$effect(() => {
		if ((last?.outcome === 'refused' || last?.outcome === 'refunded') && isResumed(last.request)) {
			resumed = undefined;
		}
	});

	const failureText = ({
		result,
		amount
	}: {
		result: Extract<CyclesTopUpResult, { status: 'refused' | 'refunded' }>;
		amount: bigint;
	}): string => {
		if (result.status === 'refunded') {
			// The ledger refunds the amount minus its fee, so with the fee the burn took, the
			// attempt costs the fee twice.
			return nonNullish(result.refundBlockIndex)
				? replacePlaceholders($i18n.cycles_top_up.error.refunded, {
						$refund: formatAmount(amount - token.fee),
						$token: token.symbol,
						$fees: formatAmount(token.fee * 2n)
					})
				: $i18n.cycles_top_up.error.refunded_nothing;
		}

		return result.refusal === 'insufficient_funds'
			? replacePlaceholders($i18n.cycles_top_up.error.insufficient_funds, {
					$token: token.symbol
				})
			: result.refusal === 'too_old' || result.refusal === 'created_in_future'
				? $i18n.cycles_top_up.error.clock
				: $i18n.cycles_top_up.error.refused;
	};

	const topUp = async () => {
		const principal = parseCanisterId(canisterIdText);

		if (isNullish($authIdentity) || isNullish(principal) || isNullish(amount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		const sender = $authIdentity.getPrincipal().toText();

		if (sender !== openedFor) {
			close();
			return;
		}

		const resent = nonNullish(resendable) && resendsUnanswered;

		const request: CyclesTopUpRequest =
			nonNullish(resendable) && resendsUnanswered
				? resendable
				: { canisterId: principal.toText(), amount, createdAt: nowInBigIntNanoSeconds() };

		// Stored before it is sent, so a modal opened while it is in flight, after this one was
		// closed by leaving the page, starts on its Review and resends it rather than sending a
		// second withdrawal.
		const send = Symbol();

		lastCyclesTopUps.update((all) => ({ ...all, [sender]: { request, send } }));

		const analytics = { step: 'top_up' as const, tokenSymbol: token.symbol };

		progressStep = ProgressStepsCyclesTopUp.INITIALIZATION;

		modal?.next();

		trackCyclesTopUp({ ...analytics, resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING });

		progressStep = ProgressStepsCyclesTopUp.TOP_UP;

		const answer = await topUpCanister({
			identity: $authIdentity,
			canisterId: principal,
			amount: request.amount,
			createdAt: request.createdAt,
			indexCanisterId: token.indexCanisterId
		});

		// A resend past the ledger's 24-hour window is refused as too old whatever happened to the
		// first call, which may have gone through: its outcome stays unknown, and Top up keeps
		// resending that same request rather than starting a fresh one.
		const result: CyclesTopUpResult =
			resent && answer.status === 'refused' && answer.refusal === 'too_old'
				? { status: 'unknown' }
				: answer;

		// Only a top-up without an answer may be resent as it was: any other answer settles it,
		// and its outcome stays with it for a modal opened on it (above). The stored request is
		// updated only while this send still owns it: a resend from a later modal, or a newer
		// top-up, may have taken it over, settled or replaced it while this answer was on its way.
		lastCyclesTopUps.update((all) =>
			all[sender]?.send === send
				? {
						...all,
						[sender]: {
							request,
							send,
							...(result.status !== 'unknown' && { outcome: result.status })
						}
					}
				: all
		);

		if (result.status === 'topped_up') {
			trackCyclesTopUp({ ...analytics, resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS });

			progressStep = ProgressStepsCyclesTopUp.DONE;

			toastsShow({
				text: replacePlaceholders($i18n.cycles_top_up.text.topped_up, {
					$canister: shortenWithMiddleEllipsis({ text: request.canisterId }),
					$amount: formatAmount(request.amount),
					$token: token.symbol
				}),
				level: 'success',
				duration: 4000
			});

			waitAndTriggerWallet();

			if (!destroyed) {
				closeTimer = setTimeout(close, 750);
			}
			return;
		}

		trackCyclesTopUp({
			...analytics,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			errorCode: result.status
		});

		// Review shows the warning for a top-up without an answer.
		if (result.status === 'refused' || result.status === 'refunded') {
			if (isResumed(request)) {
				resumed = undefined;
			}
			toastsError({ msg: { text: failureText({ result, amount: request.amount }) } });
		}

		if (result.status === 'refunded') {
			waitAndTriggerWallet();
		}

		if (!destroyed) {
			modal?.back();
		}
	};
</script>

<ConvertContexts destinationToken={token} sourceToken={token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsCyclesTopUp.TOPPING_UP}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsCyclesTopUp.CANISTER}
				<CyclesTopUpCanister
					cyclesToken={token}
					onCancel={close}
					onNext={() => modal?.next()}
					{token}
					bind:canisterIdText
				/>
			{:else if currentStep?.name === WizardStepsCyclesTopUp.AMOUNT}
				<CyclesTopUpAmount
					onBack={() => modal?.back()}
					onNext={() => modal?.next()}
					bind:sendAmount
				/>
			{:else if currentStep?.name === WizardStepsCyclesTopUp.REVIEW && nonNullish(canisterId)}
				<CyclesTopUpReview
					{canisterId}
					onBack={() => modal?.back()}
					onTopUp={topUp}
					{sendAmount}
					unknownOutcome={nonNullish(resendable)
						? resendsUnanswered
							? 'resend'
							: 'fresh'
						: undefined}
				/>
			{:else if currentStep?.name === WizardStepsCyclesTopUp.TOPPING_UP && nonNullish(canisterId)}
				<CyclesTopUpProgress {canisterId} {progressStep} />
			{/if}
		{/key}
	</WizardModal>
</ConvertContexts>
