<script lang="ts">
	import { isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import CyclesTopUpAmount from '$icp/components/cycles-top-up/CyclesTopUpAmount.svelte';
	import CyclesTopUpCanister from '$icp/components/cycles-top-up/CyclesTopUpCanister.svelte';
	import CyclesTopUpProgress from '$icp/components/cycles-top-up/CyclesTopUpProgress.svelte';
	import CyclesTopUpReview from '$icp/components/cycles-top-up/CyclesTopUpReview.svelte';
	import { topUpCanister } from '$icp/services/cycles-top-up.services';
	import type { CyclesTopUpResult } from '$icp/types/cycles-top-up';
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

	interface TopUpRequest {
		canisterId: string;
		amount: bigint;
		createdAt: bigint;
	}

	// A top-up that got no answer. Sending the same canister and amount again reuses its
	// creation time, so the ledger answers with the first one's block if it went through,
	// and the top-up runs at most once. The ledger keeps that for 24 hours, far longer than
	// a modal stays open; a new modal makes a new request.
	let unanswered = $state<TopUpRequest | undefined>();

	let canisterId = $derived(parseCanisterId(canisterIdText)?.toText());

	let amount = $derived(
		nonNullish(sendAmount) && !invalidAmount(sendAmount)
			? parseToken({ value: `${sendAmount}`, unitName: token.decimals })
			: undefined
	);

	let resendsUnanswered = $derived(
		nonNullish(unanswered) && unanswered.canisterId === canisterId && unanswered.amount === amount
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

	const close = () =>
		closeModal(() => {
			canisterIdText = '';
			sendAmount = undefined;
			unanswered = undefined;
			progressStep = ProgressStepsCyclesTopUp.INITIALIZATION;
			currentStep = undefined;
		});

	const formatAmount = (value: bigint): string =>
		formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals });

	const failureText = (
		result: Extract<CyclesTopUpResult, { status: 'refused' | 'refunded' }>
	): string => {
		if (result.status === 'refunded') {
			// The burn and the refund each cost the ledger fee.
			return nonNullish(result.refundBlockIndex)
				? replacePlaceholders($i18n.cycles_top_up.error.refunded, {
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

		const request: TopUpRequest =
			nonNullish(unanswered) && resendsUnanswered
				? unanswered
				: { canisterId: principal.toText(), amount, createdAt: nowInBigIntNanoSeconds() };

		const analytics = { step: 'top_up' as const, tokenSymbol: token.symbol };

		progressStep = ProgressStepsCyclesTopUp.INITIALIZATION;

		modal?.next();

		trackCyclesTopUp({ ...analytics, resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING });

		progressStep = ProgressStepsCyclesTopUp.TOP_UP;

		const result = await topUpCanister({
			identity: $authIdentity,
			canisterId: principal,
			amount: request.amount,
			createdAt: request.createdAt
		});

		if (result.status === 'topped_up') {
			unanswered = undefined;

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

			setTimeout(close, 750);
			return;
		}

		trackCyclesTopUp({
			...analytics,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			errorCode: result.status
		});

		// Only a top-up without an answer may be resent as it was. After a refund, the same
		// request would be answered as a duplicate of the refunded one.
		unanswered = result.status === 'unknown' ? request : undefined;

		// Review shows the warning for a top-up without an answer.
		if (result.status === 'refused' || result.status === 'refunded') {
			toastsError({ msg: { text: failureText(result) } });
		}

		if (result.status === 'refunded') {
			waitAndTriggerWallet();
		}

		modal?.back();
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
					unknownOutcome={resendsUnanswered}
				/>
			{:else if currentStep?.name === WizardStepsCyclesTopUp.TOPPING_UP && nonNullish(canisterId)}
				<CyclesTopUpProgress {canisterId} {progressStep} />
			{/if}
		{/key}
	</WizardModal>
</ConvertContexts>
