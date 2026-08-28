<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, setContext } from 'svelte';
	import type { MyTip } from '$declarations/backend/backend.did';
	import type { IcToken } from '$icp/types/ic-token';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import TipCreate from '$lib/components/tip/TipCreate.svelte';
	import TipHistory from '$lib/components/tip/TipHistory.svelte';
	import TipIntro from '$lib/components/tip/TipIntro.svelte';
	import TipShare from '$lib/components/tip/TipShare.svelte';
	import TipTokensList from '$lib/components/tip/TipTokensList.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { tipWizardSteps } from '$lib/config/tip.config';
	import { DEFAULT_TIP_EXPIRY_MS, TIP_EXPIRY_OPTIONS } from '$lib/constants/tip.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { WizardStepsTip } from '$lib/enums/wizard-steps';
	import { trackTip } from '$lib/services/tip-analytics.services';
	import {
		cancelTip,
		newTipDraft,
		recoverTipLink,
		reserveTip,
		type TipDraft
	} from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { emit } from '$lib/utils/events.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { tippableTokens } from '$lib/utils/tip.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let modal: WizardModal<WizardStepsTip> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTip> | undefined = $state();
	let selectedToken: IcToken | undefined = $state();
	let draft: TipDraft | undefined = $state();
	let link: string | undefined = $state();
	// Why there is no link, when there is not going to be one.
	let linkMessage: string | undefined = $state();
	let expiresAtNs: bigint | undefined = $state();
	// What was actually reserved, in base units. The share screen confirms this
	// rather than re-deriving it from the input, which the user can still edit.
	let reservedAmount: bigint | undefined = $state();
	// The History row currently open on the share step, if any. Distinguishes a
	// freshly created tip (nothing to cancel yet from here) from a live one
	// reopened for a second look.
	let viewingTip = $state<MyTip | undefined>();
	// The recoverable copy of the claim code could not be saved, so this link is
	// the only one there will be.
	let linkNotSaved = $state(false);
	let busy = $state(false);
	// True while a reservation is in flight and the share screen is already up.
	let generating = $state(false);
	let amount: OptionAmount = $state();
	let durationMs: number = $state(DEFAULT_TIP_EXPIRY_MS);
	let message = $state('');

	// The top of the funnel. Every later step is the same `tip` event with a
	// different modifier, so the drop-off between them is answerable.
	onMount(() => trackTip({ step: 'open', side: 'sender' }));

	// The label, not the millisecond count: `7d` is what a reader of the dashboard
	// can act on, and it is already the vocabulary of the form.
	const expiryLabel = (ms: number): string =>
		TIP_EXPIRY_OPTIONS.find((option) => option.ms === ms)?.labelKey ?? `${ms}ms`;

	const tokensListContext = initModalTokensListContext({ tokens: [] });
	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	const steps: WizardSteps<WizardStepsTip> = $derived(tipWizardSteps({ i18n: $i18n }));

	const goToStep = (stepName: WizardStepsTip) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	// Always enter the picker with a clean query, so it never reopens filtered from
	// a previous visit (mirrors the swap and lend flows).
	const enterTokensList = () => {
		tokensListContext.setFilterQuery('');
		goToStep(WizardStepsTip.TOKENS_LIST);
	};

	const onSelectToken = (token: IcToken) => {
		selectedToken = token;
		// One draft per tip, kept across retries: reusing the id means a retried
		// approve replaces the same allowance instead of stranding the first one.
		draft ??= newTipDraft();
		goToStep(WizardStepsTip.CREATE);
	};

	// Reuses the share step rather than building a second link screen: the QR, the
	// copy and share actions and the deadline are all already there, and a
	// recovered link is the same thing the sender saw when they created it.
	let cancelling = $state(false);

	const cancelViewedTip = async () => {
		if (isNullish($authIdentity) || isNullish(viewingTip)) {
			return;
		}

		cancelling = true;

		try {
			await cancelTip({
				identity: $authIdentity,
				tipId: viewingTip.tip_id,
				ledgerCanisterId: viewingTip.ledger_canister_id.toText()
			});
			trackTip({
				step: 'cancel',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				symbol: selectedToken?.symbol
			});
			toastsShow({ text: $i18n.tip.text.cancelled_toast, level: 'success' });

			// History reloads its own list on mount, but `tipsStore` — which feeds the
			// overview on the intro screen and the dot on the menu icon — is loaded
			// once at sign-in and never again. Cancelling a *failed* tip was the case
			// that showed it: the sender dealt with the very thing the warning asked
			// them to deal with, and the warning stayed up until a page reload.
			emit({ message: 'oisyRefreshTips' });

			viewingTip = undefined;
			// Back to the list, which reloads on mount, so the cancelled row cannot
			// linger claiming to be live.
			goToStep(WizardStepsTip.HISTORY);
		} catch (err: unknown) {
			trackTip({
				step: 'cancel',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				symbol: selectedToken?.symbol
			});
			toastsError({ msg: { text: $i18n.tip.text.cancel_failed }, err });
		} finally {
			cancelling = false;
		}
	};

	/**
	 * Opens a tip from its History row: transition first, link second.
	 *
	 * Everything the row already knew — token, amount, deadline — is enough to
	 * draw the screen, so it opens on the click. Recovering the link derives a
	 * vetKey and decrypts, which can take seconds; doing that before the
	 * transition made the click look like it had missed, so it now happens with
	 * the screen already up and its own loading state showing.
	 *
	 * A link that cannot be recovered leaves the screen standing rather than
	 * bouncing back: the amount, the deadline and Cancel are all still useful, and
	 * `linkMessage` says why the code is missing where the code would have been.
	 */
	const openTip = async (tip: MyTip) => {
		if (isNullish($authIdentity)) {
			return;
		}

		selectedToken = tippableTokens($tokens).find(
			({ ledgerCanisterId }) => ledgerCanisterId === tip.ledger_canister_id.toText()
		);
		reservedAmount = tip.amount;
		expiresAtNs = tip.expires_at_ns;
		viewingTip = tip;
		trackTip({ step: 'reopen', side: 'sender', symbol: selectedToken?.symbol });
		link = undefined;
		linkMessage = undefined;
		goToStep(WizardStepsTip.SHARE);

		try {
			const recovered = await recoverTipLink({ identity: $authIdentity, tipId: tip.tip_id });

			// Not an error: a tip created before the recovery store existed has no
			// stored code, and no amount of retrying will conjure one.
			linkMessage = isNullish(recovered) ? $i18n.tip.text.link_unavailable : undefined;
			link = recovered;
		} catch (_: unknown) {
			linkMessage = $i18n.tip.text.link_recovery_failed;
		}
	};

	const generate = async () => {
		if (
			isNullish($authIdentity) ||
			isNullish(selectedToken) ||
			isNullish(draft) ||
			invalidAmount(amount)
		) {
			return;
		}

		busy = true;
		generating = true;

		const parsedAmount = parseToken({
			value: `${amount}`,
			unitName: selectedToken.decimals
		});

		// Client wall-clock is fine: the canister validates this against IC time
		// and the 24h–7d options dwarf any client/replica skew. Decided here rather
		// than inside `reserveTip` so the deadline is known without waiting for the
		// reservation to finish.
		const deadline = BigInt(Date.now() + durationMs) * 1_000_000n;

		// Everything the share screen needs to draw itself is already known, so it
		// opens on the click and the link lands in it. Before this the button just
		// went inactive for an approve plus two canister calls while the form sat
		// there, which reads as a dead click.
		viewingTip = undefined;
		reservedAmount = parsedAmount;
		expiresAtNs = deadline;
		link = undefined;
		linkMessage = undefined;
		goToStep(WizardStepsTip.SHARE);

		try {
			const reserved = await reserveTip({
				identity: $authIdentity,
				draft,
				ledgerCanisterId: selectedToken.ledgerCanisterId,
				amount: parsedAmount,
				fee: selectedToken.fee,
				expiresAtNs: deadline,
				message: message === '' ? undefined : message
			});

			trackTip({
				step: 'create',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				expiry: expiryLabel(durationMs),
				symbol: selectedToken.symbol
			});

			linkNotSaved = !reserved.secretStored;
			({ link } = reserved);

			// Same reason as the cancel path: the tip now exists, so it encumbers the
			// balance and belongs in the overview's open count. Neither would have
			// noticed until the next sign-in.
			emit({ message: 'oisyRefreshTips' });
		} catch (err: unknown) {
			// Back to the form. The tip does not exist, so a share screen for it must
			// not stay up with skeletons that will never resolve.
			goToStep(WizardStepsTip.CREATE);

			trackTip({
				step: 'create',
				side: 'sender',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				expiry: expiryLabel(durationMs),
				symbol: selectedToken?.symbol
			});

			// Deliberately reassuring about the money: an approve either landed and is
			// replaceable, or never happened. Either way nothing was transferred.
			toastsError({ msg: { text: $i18n.tip.text.reserve_failed }, err });
		} finally {
			busy = false;
			generating = false;
		}
	};
</script>

<!--
	Caps the dialog at 80% of the viewport on desktop. Above `sm`, gix leaves
	`--dialog-max-height` unset, so a long step stretched the modal to the screen
	edges — History with a few dozen rows read as a page rather than a dialog. The
	content area is already the scroller and the toolbar is already sticky, so
	capping the height is the whole fix: the rows scroll and Close stays put.

	No min-height, deliberately. Each step keeps sizing to its own content, which
	is what it does today; pinning a minimum would make the short steps taller
	than they need to be. Below `sm` the modal is full-page by design.

	Mirrors `NotesModal`, which is the modal this one is meant to feel like.
-->
<div class="sm:[--dialog-max-height:80dvh]">
	<TokenActionContext token={selectedToken}>
		<WizardModal bind:this={modal} onClose={modalStore.close} {steps} bind:currentStep>
			<!--
				The title tracks the state, not just the step. A screen that opens on the
				click and is still filling in should not already claim "Tip is ready" — the
				tip is not reserved yet, and saying so is how the sender knows the wait is
				expected rather than a stall.
			-->
			{#snippet title()}{generating
					? $i18n.tip.text.preparing_title
					: (currentStep?.title ?? '')}{/snippet}

			{#if currentStep?.name === WizardStepsTip.TOKENS_LIST}
				<TipTokensList onClose={() => goToStep(WizardStepsTip.INTRO)} {onSelectToken} />
			{:else if currentStep?.name === WizardStepsTip.CREATE && nonNullish(selectedToken)}
				<TipCreate
					{busy}
					onClose={modalStore.close}
					onNext={generate}
					onSelectToken={enterTokensList}
					token={selectedToken}
					bind:amount
					bind:durationMs
					bind:message
				/>
			{:else if currentStep?.name === WizardStepsTip.SHARE && nonNullish(expiresAtNs) && nonNullish(selectedToken) && nonNullish(reservedAmount)}
				<TipShare
					amount={reservedAmount}
					{cancelling}
					{expiresAtNs}
					{generating}
					{link}
					{linkMessage}
					{linkNotSaved}
					onCancel={nonNullish(viewingTip) ? cancelViewedTip : undefined}
					onDone={nonNullish(viewingTip)
						? () => goToStep(WizardStepsTip.HISTORY)
						: modalStore.close}
					token={selectedToken}
				/>
			{:else if currentStep?.name === WizardStepsTip.HISTORY}
				<TipHistory onClose={() => goToStep(WizardStepsTip.INTRO)} onOpenTip={openTip} />
			{:else}
				<TipIntro
					onGetStarted={enterTokensList}
					onViewHistory={() => goToStep(WizardStepsTip.HISTORY)}
				/>
			{/if}
		</WizardModal>
	</TokenActionContext>
</div>
