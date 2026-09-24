<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { getIcpXdrConversionRate } from '$icp/api/cmc.api';
	import CyclesMintForm from '$icp/components/cycles-mint/CyclesMintForm.svelte';
	import CyclesMintProgress from '$icp/components/cycles-mint/CyclesMintProgress.svelte';
	import CyclesMintReview from '$icp/components/cycles-mint/CyclesMintReview.svelte';
	import { CYCLES_MINT_RATE_REFRESH_INTERVAL_MILLIS } from '$icp/constants/cmc.constants';
	import { mintCycles, type CyclesMintResult } from '$icp/services/cycles-mint.services';
	import { CyclesMintError } from '$icp/types/cycles-mint';
	import type { IcToken } from '$icp/types/ic-token';
	import { estimateCyclesMintCredited } from '$icp/utils/cycles-mint.utils';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsCyclesMint } from '$lib/enums/progress-steps';
	import { WizardStepsCyclesMint } from '$lib/enums/wizard-steps';
	import { trackCyclesMint } from '$lib/services/cycles-mint-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleError } from '$lib/utils/console.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		// The page's TCYCLES token: the cycles ledger the CMC deposits into.
		destinationToken: IcToken;
	}

	let { destinationToken }: Props = $props();

	const sourceToken = ICP_TOKEN;

	// What the CMC keeps of a refund: its own ledger fees on the way back.
	const REFUND_FEE = '0.0003';

	let sendAmount = $state<OptionAmount>();
	let xdrPermyriadPerIcp = $state<bigint | undefined>();
	let rateUnavailable = $state(false);
	let progressStep = $state<ProgressStepsCyclesMint>(ProgressStepsCyclesMint.INITIALIZATION);
	let currentStep = $state<WizardStep<WizardStepsCyclesMint> | undefined>();
	let modal = $state<WizardModal<WizardStepsCyclesMint>>();

	let steps = $derived<WizardSteps<WizardStepsCyclesMint>>([
		{
			name: WizardStepsCyclesMint.MINT,
			title: replacePlaceholders($i18n.cycles_mint.text.title, {
				$token: destinationToken.symbol
			})
		},
		{
			name: WizardStepsCyclesMint.REVIEW,
			title: $i18n.convert.text.review
		},
		{
			name: WizardStepsCyclesMint.MINTING,
			title: $i18n.mint.text.minting
		}
	]);

	// A query: the rate only feeds the estimate, and the CMC converts at its own rate when
	// the notify runs anyway.
	const loadRate = async () => {
		try {
			xdrPermyriadPerIcp = await getIcpXdrConversionRate({
				identity: $authIdentity,
				certified: false
			});
			rateUnavailable = false;
		} catch (err: unknown) {
			consoleError(err);

			// A rate that loaded once stays in use until a later one does: every figure it
			// feeds is an estimate, and the CMC moves it only every 5 minutes.
			rateUnavailable = isNullish(xdrPermyriadPerIcp);
		}
	};

	let rateTimer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		trackCyclesMint({ step: 'open' });

		loadRate();
		rateTimer = setInterval(loadRate, CYCLES_MINT_RATE_REFRESH_INTERVAL_MILLIS);
	});

	onDestroy(() => clearInterval(rateTimer));

	const close = () =>
		closeModal(() => {
			sendAmount = undefined;
			progressStep = ProgressStepsCyclesMint.INITIALIZATION;
			currentStep = undefined;
		});

	// Review re-quotes at the CMC's current rate.
	const review = () => {
		loadRate();
		modal?.next();
	};

	const showResult = (result: CyclesMintResult) => {
		if (result.status === 'minted') {
			toastsShow({
				text: replacePlaceholders($i18n.cycles_mint.text.minted, {
					$amount: formatToken({
						value: result.credited,
						unitName: destinationToken.decimals,
						displayDecimals: destinationToken.decimals
					}),
					$token: destinationToken.symbol
				}),
				level: 'success',
				duration: 4000
			});
			return;
		}

		if (result.status === 'pending') {
			toastsShow({ text: $i18n.cycles_mint.text.pending, level: 'info' });
			return;
		}

		toastsError({
			msg: {
				text:
					result.status === 'refunded'
						? replacePlaceholders($i18n.cycles_mint.error.refunded, {
								$token: sourceToken.symbol,
								$refundFee: REFUND_FEE,
								$reason: result.reason
							})
						: replacePlaceholders($i18n.cycles_mint.error.failed, { $reason: result.reason })
			}
		});
	};

	const errorText = (err: unknown): string => {
		if (!(err instanceof CyclesMintError)) {
			return $i18n.send.error.unexpected;
		}

		if (err.kind === 'transfer_failed') {
			return replacePlaceholders($i18n.cycles_mint.error.transfer_failed, {
				$token: sourceToken.symbol
			});
		}

		if (err.kind === 'unconfirmed') {
			return replacePlaceholders($i18n.cycles_mint.error.unconfirmed, {
				$token: sourceToken.symbol
			});
		}

		return $i18n.cycles_mint.error.not_started;
	};

	const mint = async () => {
		if (isNullish($authIdentity) || isNullish(sendAmount) || invalidAmount(sendAmount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		const amount = parseToken({ value: `${sendAmount}`, unitName: sourceToken.decimals });
		const usdPrice = $exchanges?.[sourceToken.id]?.usd;

		progressStep = ProgressStepsCyclesMint.INITIALIZATION;

		modal?.next();

		try {
			const result = await mintCycles({
				identity: $authIdentity,
				mintId: crypto.randomUUID(),
				sourceToken,
				destinationToken,
				amount,
				estimatedCredited: nonNullish(xdrPermyriadPerIcp)
					? estimateCyclesMintCredited({ amount, xdrPermyriadPerIcp })
					: undefined,
				usdSourceValue: nonNullish(usdPrice) ? `${usdPrice * Number(sendAmount)}` : undefined,
				progress: (step) => (progressStep = step)
			});

			progressStep = ProgressStepsCyclesMint.DONE;

			showResult(result);

			setTimeout(close, 750);
		} catch (err: unknown) {
			// The ICP may be on its way: nothing is left to retry here, the background either
			// finishes the mint or finds that nothing moved.
			if (err instanceof CyclesMintError && err.kind === 'unconfirmed') {
				toastsShow({ text: errorText(err), level: 'warn' });

				close();
				return;
			}

			// Nothing moved: an ordinary error, and Review is where to try again.
			toastsError({ msg: { text: errorText(err) }, err });

			modal?.back();
		}
	};
</script>

<ConvertContexts {destinationToken} {sourceToken}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsCyclesMint.MINTING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsCyclesMint.MINT}
				<CyclesMintForm
					onCancel={close}
					onNext={review}
					{rateUnavailable}
					{xdrPermyriadPerIcp}
					bind:sendAmount
				/>
			{:else if currentStep?.name === WizardStepsCyclesMint.REVIEW}
				<CyclesMintReview
					onBack={() => modal?.back()}
					onMint={mint}
					{sendAmount}
					{xdrPermyriadPerIcp}
				/>
			{:else if currentStep?.name === WizardStepsCyclesMint.MINTING}
				<CyclesMintProgress {progressStep} />
			{/if}
		{/key}
	</WizardModal>
</ConvertContexts>
