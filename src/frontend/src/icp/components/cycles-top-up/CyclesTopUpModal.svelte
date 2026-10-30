<script lang="ts">
	import { isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import { CYCLES_TOP_UP_ENABLED } from '$env/cycles-top-up.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import { getIcpXdrConversionRate } from '$icp/api/cmc.api';
	import CyclesTopUpAmount from '$icp/components/cycles-top-up/CyclesTopUpAmount.svelte';
	import CyclesTopUpCanister from '$icp/components/cycles-top-up/CyclesTopUpCanister.svelte';
	import CyclesTopUpIcpAmount from '$icp/components/cycles-top-up/CyclesTopUpIcpAmount.svelte';
	import CyclesTopUpIcpReview from '$icp/components/cycles-top-up/CyclesTopUpIcpReview.svelte';
	import CyclesTopUpProgress from '$icp/components/cycles-top-up/CyclesTopUpProgress.svelte';
	import CyclesTopUpReview from '$icp/components/cycles-top-up/CyclesTopUpReview.svelte';
	import CyclesTopUpToken from '$icp/components/cycles-top-up/CyclesTopUpToken.svelte';
	import {
		CMC_RATE_REFRESH_INTERVAL_MILLIS,
		CYCLES_TOP_UP_REFUND_FEES
	} from '$icp/constants/cmc.constants';
	import { topUpCanister, topUpCanisterWithIcp } from '$icp/services/cycles-top-up.services';
	import { lastCyclesTopUps } from '$icp/stores/cycles-top-up.store';
	import {
		CyclesTopUpIcpError,
		type CyclesTopUpNotifyResult,
		type CyclesTopUpRequest,
		type CyclesTopUpResult
	} from '$icp/types/cycles-top-up';
	import type { IcToken } from '$icp/types/ic-token';
	import { isTokenCyclesLedger } from '$icp/utils/cycles-mint.utils';
	import {
		formatTrillionCycles,
		isCyclesTopUpTokenUsable,
		parseCanisterId
	} from '$icp/utils/cycles-top-up.utils';
	import { isTokenIcp } from '$icp/utils/icrc.utils';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SOURCE_LOCATIONS
	} from '$lib/enums/plausible';
	import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
	import { WizardStepsCyclesTopUp } from '$lib/enums/wizard-steps';
	import {
		type CyclesTopUpSourceLocation,
		trackCyclesTopUp
	} from '$lib/services/cycles-top-up-analytics.services';
	import { balancesStore } from '$lib/stores/balances.store';
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
		// opened from the navigation, which offers ICP too.
		token?: IcToken;
	}

	let { token: pageToken }: Props = $props();

	let fromNavigation = $derived(isNullish(pageToken));

	// The TCYCLES token: the page's, or from the navigation the enabled one, while Top up with
	// TCYCLES is on. Its history lists the canisters topped up before, whatever pays.
	let cyclesToken = $derived(
		pageToken ?? (CYCLES_TOP_UP_ENABLED ? $enabledIcTokens.find(isTokenCyclesLedger) : undefined)
	);

	// The tokens whose balance can pay for a top-up, ICP first, as the picker lists them.
	let usableTokens = $derived(
		[ICP_TOKEN, cyclesToken].filter(
			(token): token is IcToken =>
				nonNullish(token) &&
				isCyclesTopUpTokenUsable({ token, balance: $balancesStore?.[token.id]?.data })
		)
	);

	let pickedToken = $state<IcToken | undefined>();

	// What the top-up is paid with: from the TCYCLES page its token, from the navigation the
	// token picked, or the only one that can pay.
	let payToken = $derived(pageToken ?? pickedToken);

	let paidWithIcp = $derived(nonNullish(payToken) && isTokenIcp(payToken));

	let sourceLocation = $derived<CyclesTopUpSourceLocation>(
		fromNavigation
			? PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NAVIGATION
			: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOKEN_DETAILS
	);

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

	// The signed-in principal's TCYCLES top-up that got no answer, kept until the page reloads,
	// so a later modal has it too.
	// Sending the same canister and amount again reuses its creation time, so the ledger
	// answers with the first one's block if it went through, and the top-up runs at most
	// once. The ledger keeps that for 24 hours; a resend after that stays unknown (below).
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

	// The top-up this modal opened on (below). Top up keeps resending it after an answer to it
	// arrived while this modal was open: the same canister and amount as a fresh request would
	// run a second withdrawal. A refusal or a refund settles it instead (below).
	let resumed = $state<CyclesTopUpRequest | undefined>();

	const isResumed = ({ createdAt, canisterId, amount }: CyclesTopUpRequest): boolean =>
		resumed?.createdAt === createdAt &&
		resumed.canisterId === canisterId &&
		resumed.amount === amount;

	let resendable = $derived(unanswered ?? resumed);

	// Only a TCYCLES top-up can be resent: one paid with ICP is a new top-up.
	let resendsUnanswered = $derived(
		!paidWithIcp &&
			nonNullish(resendable) &&
			resendable.canisterId === canisterId &&
			resendable.amount === amount
	);

	// The same from both entry points, once Canister top-up is on.
	let title = $derived(
		CANISTER_TOP_UP_ENABLED
			? $i18n.cycles_top_up.text.canister_top_up
			: $i18n.cycles_top_up.text.title
	);

	// Fixed for the modal's life, as a WizardModal needs: from the navigation, the token step
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

		return fromNavigation
			? [{ name: WizardStepsCyclesTopUp.TOKEN, title }, ...topUpSteps]
			: topUpSteps;
	});

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

	const formatAmount = ({ value, token }: { value: bigint; token: IcToken }): string =>
		formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals });

	const goTo = (name: WizardStepsCyclesTopUp) => {
		const index = steps.findIndex((step) => step.name === name);

		if (index >= 0) {
			modal?.set(index);
		}
	};

	// A modal opened while the principal's last TCYCLES top-up has no answer starts on that
	// top-up's Review, from either entry point, so Top up resends it: once the first one went
	// through, the Amount step's balance check would refuse the same amount. Back leads to the
	// usual steps, where any change is a new request. The full-precision amount parses back to
	// the stored one.
	// Otherwise, a modal opened from the navigation when only one token can pay starts on the
	// canister step with that token: there is nothing to pick.
	let opened = false;

	$effect(() => {
		if (opened || isNullish(modal)) {
			return;
		}

		opened = true;

		untrack(() => {
			if (nonNullish(unanswered) && nonNullish(cyclesToken)) {
				pickedToken = cyclesToken;
				resumed = unanswered;
				canisterIdText = unanswered.canisterId;
				sendAmount = formatAmount({ value: unanswered.amount, token: cyclesToken });

				goTo(WizardStepsCyclesTopUp.REVIEW);
				return;
			}

			if (fromNavigation && usableTokens.length === 1) {
				[pickedToken] = usableTokens;

				goTo(WizardStepsCyclesTopUp.CANISTER);
			}
		});
	});

	// The modal that sent the top-up, closed by leaving the page, may get its answer while this
	// one is open on it. A refusal or a refund settles the request then too, as an answer here
	// does: nothing is left to resend, and the next top-up is a new request.
	$effect(() => {
		if ((last?.outcome === 'refused' || last?.outcome === 'refunded') && isResumed(last.request)) {
			resumed = undefined;
		}
	});

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

	const failureText = ({
		result,
		amount,
		token
	}: {
		result: Extract<CyclesTopUpResult, { status: 'refused' | 'refunded' }>;
		amount: bigint;
		token: IcToken;
	}): string => {
		if (result.status === 'refunded') {
			// The ledger refunds the amount minus its fee, so with the fee the burn took, the
			// attempt costs the fee twice.
			return nonNullish(result.refundBlockIndex)
				? replacePlaceholders($i18n.cycles_top_up.error.refunded, {
						$refund: formatAmount({ value: amount - token.fee, token }),
						$token: token.symbol,
						$fees: formatAmount({ value: token.fee * 2n, token })
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

		if (
			isNullish($authIdentity) ||
			isNullish(cyclesToken) ||
			isNullish(principal) ||
			isNullish(amount)
		) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		const token = cyclesToken;

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

		const analytics = { step: 'top_up' as const, tokenSymbol: token.symbol, sourceLocation };

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
					$amount: formatAmount({ value: request.amount, token }),
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
			toastsError({ msg: { text: failureText({ result, amount: request.amount, token }) } });
		}

		if (result.status === 'refunded') {
			waitAndTriggerWallet();
		}

		if (!destroyed) {
			modal?.back();
		}
	};

	const formatIcp = (value: bigint): string => formatAmount({ value, token: ICP_TOKEN });

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

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsCyclesTopUp.TOKEN}
			<CyclesTopUpToken onCancel={close} onSelect={pickToken} tokens={usableTokens} />
		{:else if currentStep?.name === WizardStepsCyclesTopUp.CANISTER && nonNullish(payToken)}
			<CyclesTopUpCanister
				{cyclesToken}
				onBack={fromNavigation && usableTokens.length > 1 ? () => modal?.back() : undefined}
				onCancel={close}
				onNext={() => modal?.next()}
				token={payToken}
				bind:canisterIdText
			/>
		{:else if nonNullish(payToken)}
			<!-- One per step, for the token picked: the contexts read their tokens only once. -->
			<ConvertContexts destinationToken={payToken} sourceToken={payToken}>
				{#if currentStep?.name === WizardStepsCyclesTopUp.AMOUNT}
					{#if paidWithIcp}
						<CyclesTopUpIcpAmount
							onBack={() => modal?.back()}
							onNext={reviewIcp}
							{rateUnavailable}
							{xdrPermyriadPerIcp}
							bind:sendAmount
						/>
					{:else}
						<CyclesTopUpAmount
							onBack={() => modal?.back()}
							onNext={() => modal?.next()}
							bind:sendAmount
						/>
					{/if}
				{:else if currentStep?.name === WizardStepsCyclesTopUp.REVIEW && nonNullish(canisterId)}
					{#if paidWithIcp}
						<CyclesTopUpIcpReview
							{canisterId}
							onBack={() => modal?.back()}
							onTopUp={topUpWithIcp}
							{requoting}
							{sendAmount}
							{xdrPermyriadPerIcp}
						/>
					{:else}
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
					{/if}
				{:else if currentStep?.name === WizardStepsCyclesTopUp.TOPPING_UP && nonNullish(canisterId)}
					<CyclesTopUpProgress {canisterId} {paidWithIcp} {progressStep} />
				{/if}
			</ConvertContexts>
		{/if}
	{/key}
</WizardModal>
