<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, setContext } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import TipCreate from '$lib/components/tip/TipCreate.svelte';
	import TipIntro from '$lib/components/tip/TipIntro.svelte';
	import TipShare from '$lib/components/tip/TipShare.svelte';
	import TipTokensList from '$lib/components/tip/TipTokensList.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { tipWizardSteps } from '$lib/config/tip.config';
	import { DEFAULT_TIP_EXPIRY_MS, TIP_EXPIRY_OPTIONS } from '$lib/constants/tip.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { WizardStepsTip } from '$lib/enums/wizard-steps';
	import { trackTip } from '$lib/services/tip-analytics.services';
	import { newTipDraft, reserveTip, type TipDraft } from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';
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
	let busy = $state(false);
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

			reservedAmount = parsedAmount;
			({ link, expiresAtNs } = reserved);
			goToStep(WizardStepsTip.SHARE);
		} catch (err: unknown) {
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
				{expiresAtNs}
				{link}
				onDone={modalStore.close}
				token={selectedToken}
			/>
		{:else}
			<TipIntro onGetStarted={enterTokensList} onViewHistory={modalStore.close} />
		{/if}
	</WizardModal>
</TokenActionContext>
