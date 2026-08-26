<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { setContext } from 'svelte';
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
	import { DEFAULT_TIP_EXPIRY_MS } from '$lib/constants/tip.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { WizardStepsTip } from '$lib/enums/wizard-steps';
	import { cancelTip, newTipDraft, reserveTip, type TipDraft } from '$lib/services/tip.services';
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
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { tippableTokens } from '$lib/utils/tip.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let modal: WizardModal<WizardStepsTip> | undefined = $state();
	let currentStep: WizardStep<WizardStepsTip> | undefined = $state();
	let selectedToken: IcToken | undefined = $state();
	let draft: TipDraft | undefined = $state();
	let link: string | undefined = $state();
	let expiresAtNs: bigint | undefined = $state();
	// What was actually reserved, in base units. The share screen confirms this
	// rather than re-deriving it from the input, which the user can still edit.
	let reservedAmount: bigint | undefined = $state();
	// The History row currently open on the share step, if any. Distinguishes a
	// freshly created tip (nothing to cancel yet from here) from a live one
	// reopened for a second look.
	let viewingTip = $state<MyTip | undefined>();
	let busy = $state(false);
	let amount: OptionAmount = $state();
	let durationMs: number = $state(DEFAULT_TIP_EXPIRY_MS);
	let message = $state('');

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
			toastsShow({ text: $i18n.tip.text.cancelled_toast, level: 'success' });
			viewingTip = undefined;
			// Back to the list, which reloads on mount, so the cancelled row cannot
			// linger claiming to be live.
			goToStep(WizardStepsTip.HISTORY);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.tip.text.cancel_failed }, err });
		} finally {
			cancelling = false;
		}
	};

	const showRecoveredLink = ({ tip, link: recovered }: { tip: MyTip; link: string }) => {
		selectedToken = tippableTokens($tokens).find(
			({ ledgerCanisterId }) => ledgerCanisterId === tip.ledger_canister_id.toText()
		);
		reservedAmount = tip.amount;
		expiresAtNs = tip.expires_at_ns;
		link = recovered;
		viewingTip = tip;
		goToStep(WizardStepsTip.SHARE);
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

		try {
			const parsedAmount = parseToken({
				value: `${amount}`,
				unitName: selectedToken.decimals
			});

			const reserved = await reserveTip({
				identity: $authIdentity,
				draft,
				ledgerCanisterId: selectedToken.ledgerCanisterId,
				amount: parsedAmount,
				fee: selectedToken.fee,
				durationMs,
				message: message === '' ? undefined : message
			});

			viewingTip = undefined;
			reservedAmount = parsedAmount;
			({ link, expiresAtNs } = reserved);
			goToStep(WizardStepsTip.SHARE);
		} catch (err: unknown) {
			// Deliberately reassuring about the money: an approve either landed and is
			// replaceable, or never happened. Either way nothing was transferred.
			toastsError({ msg: { text: $i18n.tip.text.reserve_failed }, err });
		} finally {
			busy = false;
		}
	};
</script>

<TokenActionContext token={selectedToken}>
	<WizardModal bind:this={modal} onClose={modalStore.close} {steps} bind:currentStep>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

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
		{:else if currentStep?.name === WizardStepsTip.SHARE && nonNullish(link) && nonNullish(expiresAtNs) && nonNullish(selectedToken) && nonNullish(reservedAmount)}
			<TipShare
				amount={reservedAmount}
				{cancelling}
				{expiresAtNs}
				{link}
				onCancel={nonNullish(viewingTip) ? cancelViewedTip : undefined}
				onDone={nonNullish(viewingTip) ? () => goToStep(WizardStepsTip.HISTORY) : modalStore.close}
				token={selectedToken}
			/>
		{:else if currentStep?.name === WizardStepsTip.HISTORY}
			<TipHistory onClose={() => goToStep(WizardStepsTip.INTRO)} onViewLink={showRecoveredLink} />
		{:else}
			<TipIntro
				onGetStarted={enterTokensList}
				onViewHistory={() => goToStep(WizardStepsTip.HISTORY)}
			/>
		{/if}
	</WizardModal>
</TokenActionContext>
