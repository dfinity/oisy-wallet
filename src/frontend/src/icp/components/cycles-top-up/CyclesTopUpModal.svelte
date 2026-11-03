<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import { CYCLES_TOP_UP_ENABLED } from '$env/cycles-top-up.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { getIcpXdrConversionRate } from '$icp/api/cmc.api';
	import CyclesTopUpCanister from '$icp/components/cycles-top-up/CyclesTopUpCanister.svelte';
	import CyclesTopUpIcpAmount from '$icp/components/cycles-top-up/CyclesTopUpIcpAmount.svelte';
	import CyclesTopUpIcpReview from '$icp/components/cycles-top-up/CyclesTopUpIcpReview.svelte';
	import CyclesTopUpProgress from '$icp/components/cycles-top-up/CyclesTopUpProgress.svelte';
	import CyclesTopUpToken from '$icp/components/cycles-top-up/CyclesTopUpToken.svelte';
	import CyclesTopUpWizard from '$icp/components/cycles-top-up/CyclesTopUpWizard.svelte';
	import {
		CMC_RATE_REFRESH_INTERVAL_MILLIS,
		CYCLES_TOP_UP_REFUND_FEES
	} from '$icp/constants/cmc.constants';
	import { icrcTokens } from '$icp/derived/icrc.derived';
	import { topUpCanisterWithIcp } from '$icp/services/cycles-top-up.services';
	import { lastCyclesTopUps } from '$icp/stores/cycles-top-up.store';
	import { CyclesTopUpIcpError, type CyclesTopUpNotifyResult } from '$icp/types/cycles-top-up';
	import type { IcToken } from '$icp/types/ic-token';
	import { isTokenCyclesLedger } from '$icp/utils/cycles-mint.utils';
	import { formatTrillionCycles, parseCanisterId } from '$icp/utils/cycles-top-up.utils';
	import { isTokenIcp } from '$icp/utils/icrc.utils';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
	import { WizardStepsCyclesTopUp } from '$lib/enums/wizard-steps';
	import {
		type CyclesTopUpSourceLocation,
		trackCyclesTopUp
	} from '$lib/services/cycles-top-up-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleError } from '$lib/utils/console.utils';
	import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';

	interface Props {
		// The TCYCLES token of the page the modal opened from, which pays. Without it, the modal
		// opened from Tools, which offers ICP too.
		token?: IcToken;
	}

	let { token: pageToken }: Props = $props();

	let fromTools = $derived(isNullish(pageToken));

	// The TCYCLES token: the page's, or from Tools the enabled one, while Top up with
	// TCYCLES is on. Its history lists the canisters topped up before, whatever pays.
	let cyclesToken = $derived(
		pageToken ?? (CYCLES_TOP_UP_ENABLED ? $enabledIcTokens.find(isTokenCyclesLedger) : undefined)
	);

	// What the picker lists from Tools, ICP first: ICP and, while Top up with TCYCLES is on,
	// TCYCLES, enabled or not, so both ways to pay show. The picker tells which can pay.
	let payTokens = $derived.by<IcToken[]>(() => {
		const tcycles = CYCLES_TOP_UP_ENABLED ? $icrcTokens.find(isTokenCyclesLedger) : undefined;

		return nonNullish(tcycles) ? [ICP_TOKEN, tcycles] : [ICP_TOKEN];
	});

	let pickedToken = $state<IcToken | undefined>();

	// What the top-up is paid with: from the TCYCLES page its token, from Tools the token
	// picked.
	let payToken = $derived(pageToken ?? pickedToken);

	let paidWithIcp = $derived(nonNullish(payToken) && isTokenIcp(payToken));

	let sourceLocation = $derived<CyclesTopUpSourceLocation>(
		fromTools
			? PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOOLS_PAGE
			: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOKEN_DETAILS
	);

	// The inputs and the progress of a top-up paid with ICP. Paid with TCYCLES, the wizard holds
	// its own.
	let canisterIdText = $state('');
	let sendAmount = $state<OptionAmount>();
	let progressStep = $state<ProgressStepsCyclesTopUp>(ProgressStepsCyclesTopUp.INITIALIZATION);
	let currentStep = $state<WizardStep<WizardStepsCyclesTopUp> | undefined>();
	let modal = $state<WizardModal<WizardStepsCyclesTopUp>>();

	// The principal this modal opened for. A sign-in in another tab can switch this tab's
	// identity without a reload, and the inputs belong to this principal: the modal closes
	// rather than top up from another account.
	const openedFor = get(authIdentity)?.getPrincipal().toText();

	let signedInAsOther = $derived($authIdentity?.getPrincipal().toText() !== openedFor);

	// The signed-in principal's TCYCLES top-up that got no answer, kept until the page reloads,
	// which the wizard opens on (below).
	let last = $derived(
		nonNullish($authIdentity) ? $lastCyclesTopUps[$authIdentity.getPrincipal().toText()] : undefined
	);

	let unanswered = $derived(isNullish(last?.outcome) ? last?.request : undefined);

	let canisterId = $derived(parseCanisterId(canisterIdText)?.toText());

	let amount = $derived(
		nonNullish(payToken) && nonNullish(sendAmount) && !invalidAmount(sendAmount)
			? parseToken({ value: `${sendAmount}`, unitName: payToken.decimals })
			: undefined
	);

	// The same from both entry points, once Canister top-up is on.
	let title = $derived(
		CANISTER_TOP_UP_ENABLED
			? $i18n.cycles_top_up.text.canister_top_up
			: $i18n.cycles_top_up.text.title
	);

	// Fixed for the modal's life, as a WizardModal needs: from Tools, the token step
	// comes first, even when the modal opens past it (below).
	let steps = $derived.by<WizardSteps<WizardStepsCyclesTopUp>>(() => {
		const topUpSteps: WizardSteps<WizardStepsCyclesTopUp> = [
			{
				name: WizardStepsCyclesTopUp.CANISTER,
				title
			},
			{
				name: WizardStepsCyclesTopUp.AMOUNT,
				title
			},
			{
				name: WizardStepsCyclesTopUp.REVIEW,
				title: $i18n.convert.text.review
			},
			{
				name: WizardStepsCyclesTopUp.TOPPING_UP,
				title
			}
		];

		return fromTools ? [{ name: WizardStepsCyclesTopUp.TOKEN, title }, ...topUpSteps] : topUpSteps;
	});

	// Reported here whatever pays, before anything is picked: the wizard leaves it to the modal.
	onMount(() => trackCyclesTopUp({ step: 'open', sourceLocation }));

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

	const goTo = (name: WizardStepsCyclesTopUp) => {
		const index = steps.findIndex((step) => step.name === name);

		if (index >= 0) {
			modal?.set(index);
		}
	};

	// A modal opened while the principal's last TCYCLES top-up has no answer goes to that
	// top-up's Review with TCYCLES, from either entry point, where the wizard fills it in so Top
	// up resends it. Otherwise, from Tools, it starts on the token picker, even when only one
	// token can pay: the picker shows both ways to pay.
	let opened = false;

	$effect(() => {
		if (opened || isNullish(modal)) {
			return;
		}

		opened = true;

		untrack(() => {
			if (nonNullish(unanswered) && nonNullish(cyclesToken)) {
				pickedToken = cyclesToken;

				goTo(WizardStepsCyclesTopUp.REVIEW);
			}
		});
	});

	// Back to the token picker from the canister step, which comes first from Tools.
	let backToToken = $derived(fromTools ? () => modal?.back() : undefined);

	const pickToken = (token: IcToken) => {
		// An amount is in its token's units.
		if (token.id !== pickedToken?.id) {
			sendAmount = undefined;
		}

		pickedToken = token;

		modal?.next();
	};

	// Paid with ICP, the cycles come at the CMC's rate, read as in Mint: once ICP is picked
	// and every minute after.
	let xdrPermyriadPerIcp = $state<bigint | undefined>();
	let rateUnavailable = $state(false);

	// Reads can come back out of order: the minute's refresh may still be on its way when
	// Review re-quotes. A rate only replaces the one in use if its read started later.
	let rateReads = 0;
	let rateInUseRead = 0;

	// A query: the rate only feeds the estimate, and the CMC converts at its own rate when the
	// notify runs anyway.
	const loadRate = async () => {
		const read = ++rateReads;

		try {
			const rate = await getIcpXdrConversionRate({
				identity: $authIdentity,
				certified: false
			});

			if (read < rateInUseRead) {
				return;
			}

			rateInUseRead = read;
			xdrPermyriadPerIcp = rate;
			rateUnavailable = false;
		} catch (err: unknown) {
			consoleError(err);

			// A rate that loaded once stays in use until a later one does, as in Mint.
			rateUnavailable = isNullish(xdrPermyriadPerIcp);
		}
	};

	$effect(() => {
		if (!paidWithIcp) {
			return;
		}

		untrack(loadRate);

		const rateTimer = setInterval(loadRate, CMC_RATE_REFRESH_INTERVAL_MILLIS);

		return () => clearInterval(rateTimer);
	});

	// Review re-quotes at the CMC's current rate, and Top up waits for that quote, as in Mint.
	// Only the latest Review's quote counts: one that Back left behind must not hold it back.
	let requotes = 0;
	let requoting = $state(false);

	const reviewIcp = () => {
		const requote = ++requotes;

		requoting = true;

		loadRate().finally(() => {
			if (requote === requotes) {
				requoting = false;
			}
		});

		modal?.next();
	};

	const formatIcp = (value: bigint): string =>
		formatToken({ value, unitName: ICP_TOKEN.decimals, displayDecimals: ICP_TOKEN.decimals });

	// Once the ICP reached the CMC, the modal only reports: the top-up's row in Active
	// transactions settles it, and its analytics fire from there.
	const showIcpResult = ({
		result,
		canisterId
	}: {
		result: CyclesTopUpNotifyResult;
		canisterId: string;
	}) => {
		if (result.status === 'topped_up') {
			toastsShow({
				text: replacePlaceholders($i18n.cycles_top_up.text.topped_up_cycles, {
					$canister: shortenWithMiddleEllipsis({ text: canisterId }),
					$amount: formatTrillionCycles(result.cycles)
				}),
				level: 'success',
				duration: 4000
			});
			return;
		}

		if (result.status === 'pending') {
			toastsShow({ text: $i18n.cycles_top_up.text.pending, level: 'info' });
			return;
		}

		// Without the CMC's own reason, as for a TCYCLES top-up: it is protocol text.
		toastsError({
			msg: {
				text:
					result.status === 'refunded'
						? nonNullish(result.refundBlockIndex)
							? replacePlaceholders($i18n.cycles_top_up.error.refunded_icp, {
									$token: ICP_TOKEN.symbol,
									$fees: formatIcp(CYCLES_TOP_UP_REFUND_FEES)
								})
							: $i18n.cycles_top_up.error.refunded_nothing
						: replacePlaceholders($i18n.cycles_top_up.error.failed, {
								$token: ICP_TOKEN.symbol
							})
			}
		});
	};

	const icpErrorText = (err: unknown): string => {
		if (!(err instanceof CyclesTopUpIcpError)) {
			return $i18n.send.error.unexpected;
		}

		if (err.kind === 'transfer_failed') {
			return replacePlaceholders($i18n.cycles_top_up.error.transfer_failed, {
				$token: ICP_TOKEN.symbol
			});
		}

		if (err.kind === 'unconfirmed') {
			return replacePlaceholders($i18n.cycles_top_up.error.unconfirmed, {
				$token: ICP_TOKEN.symbol
			});
		}

		return $i18n.cycles_top_up.error.not_started;
	};

	const topUpWithIcp = async () => {
		const principal = parseCanisterId(canisterIdText);

		if (isNullish($authIdentity) || isNullish(principal) || isNullish(amount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		if ($authIdentity.getPrincipal().toText() !== openedFor) {
			close();
			return;
		}

		const usdPrice = $exchanges?.[ICP_TOKEN.id]?.usd;

		progressStep = ProgressStepsCyclesTopUp.INITIALIZATION;

		modal?.next();

		try {
			const result = await topUpCanisterWithIcp({
				identity: $authIdentity,
				topUpId: crypto.randomUUID(),
				sourceToken: ICP_TOKEN,
				canisterId: principal,
				amount,
				usdSourceValue: nonNullish(usdPrice) ? `${usdPrice * Number(sendAmount)}` : undefined,
				progress: (step) => (progressStep = step)
			});

			progressStep = ProgressStepsCyclesTopUp.DONE;

			showIcpResult({ result, canisterId: principal.toText() });

			// The ICP left the wallet, whatever the CMC answered.
			waitAndTriggerWallet();

			if (!destroyed) {
				closeTimer = setTimeout(close, 750);
			}
		} catch (err: unknown) {
			// The ICP may be on its way: nothing is left to retry here, the background either
			// finishes the top-up or finds that nothing moved.
			if (err instanceof CyclesTopUpIcpError && err.kind === 'unconfirmed') {
				toastsShow({ text: icpErrorText(err), level: 'warn' });

				waitAndTriggerWallet();

				if (!destroyed) {
					close();
				}
				return;
			}

			// Nothing moved: an ordinary error, and Review is where to try again. Without the
			// error's own text, as for a TCYCLES top-up: the service logged what went wrong, and
			// only an unexpected error is left to log here.
			if (!(err instanceof CyclesTopUpIcpError)) {
				consoleError(err);
			}

			toastsError({ msg: { text: icpErrorText(err) } });

			if (!destroyed) {
				modal?.back();
			}
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsCyclesTopUp.TOPPING_UP}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#if currentStep?.name === WizardStepsCyclesTopUp.TOKEN}
		<CyclesTopUpToken onCancel={close} onSelect={pickToken} tokens={payTokens} />
	{:else if nonNullish(payToken) && !paidWithIcp}
		<!-- Paid with TCYCLES, the top-up runs as on the TCYCLES page and in Send. -->
		<CyclesTopUpWizard
			{currentStep}
			{modal}
			onBack={backToToken}
			onClose={close}
			openReported
			{sourceLocation}
			{steps}
			token={payToken}
		/>
	{:else if nonNullish(payToken)}
		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsCyclesTopUp.CANISTER}
				<CyclesTopUpCanister
					{cyclesToken}
					onBack={backToToken}
					onCancel={close}
					onNext={() => modal?.next()}
					token={payToken}
					bind:canisterIdText
				/>
			{:else}
				<ConvertContexts destinationToken={payToken} sourceToken={payToken}>
					{#if currentStep?.name === WizardStepsCyclesTopUp.AMOUNT}
						<CyclesTopUpIcpAmount
							onBack={() => modal?.back()}
							onNext={reviewIcp}
							{rateUnavailable}
							{xdrPermyriadPerIcp}
							bind:sendAmount
						/>
					{:else if currentStep?.name === WizardStepsCyclesTopUp.REVIEW && nonNullish(canisterId)}
						<CyclesTopUpIcpReview
							{canisterId}
							onBack={() => modal?.back()}
							onTopUp={topUpWithIcp}
							{requoting}
							{sendAmount}
							{xdrPermyriadPerIcp}
						/>
					{:else if currentStep?.name === WizardStepsCyclesTopUp.TOPPING_UP && nonNullish(canisterId)}
						<CyclesTopUpProgress {canisterId} {paidWithIcp} {progressStep} />
					{/if}
				</ConvertContexts>
			{/if}
		{/key}
	{/if}
</WizardModal>
