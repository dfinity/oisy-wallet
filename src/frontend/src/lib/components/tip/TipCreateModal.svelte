<script lang="ts">
	import { QRCode, Spinner, WizardModal, type WizardStep } from '@dfinity/gix-components';
	import { nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
	import { setContext } from 'svelte';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import ShareButton from '$lib/components/share/ShareButton.svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { tipWizardSteps } from '$lib/config/tip.config';
	import { NANO_SECONDS_IN_MINUTE, ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { WizardStepsTip } from '$lib/enums/wizard-steps';
	import { createAndFundTip } from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { tipWizardStore } from '$lib/stores/tip.store';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	let steps = $derived(tipWizardSteps({ i18n: $i18n }));
	let currentStep = $state<WizardStep<WizardStepsTip> | undefined>();
	let modal = $state<WizardModal<WizardStepsTip>>();

	let selectedToken = $state<Token | undefined>();
	let amount = $state<string>('');
	let title = $state<string>('');
	let note = $state<string>('');
	let expiryHours = $state<number>(24);
	let tipUrl = $state<string | undefined>();
	let error = $state<string | undefined>();

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: $enabledTokens,
			filterZeroBalance: true,
			filterNetwork: $selectedNetwork
		})
	);

	const reset = () => {
		selectedToken = undefined;
		amount = '';
		title = '';
		note = '';
		expiryHours = 24;
		tipUrl = undefined;
		error = undefined;
		tipWizardStore.reset();
		currentStep = undefined;
	};

	const close = () => closeModal(reset);

	const goToStep = (stepName: WizardStepsTip) => {
		if (nonNullish(modal)) {
			goToWizardStep({ modal, steps, stepName });
		}
	};

	const onSelectToken = (token: Token) => {
		selectedToken = token;
		tipWizardStore.setToken(token);
		goToStep(WizardStepsTip.AMOUNT);
	};

	const onAmountNext = () => {
		if (!amount || Number(amount) <= 0) {
			return;
		}
		goToStep(WizardStepsTip.REVIEW);
	};

	const parsedAmount = $derived.by(() => {
		if (!selectedToken || !amount) {
			return ZERO;
		}
		const { decimals } = selectedToken;
		const parsed = parseFloat(amount);
		if (isNaN(parsed) || parsed <= 0) {
			return ZERO;
		}
		return BigInt(Math.floor(parsed * 10 ** decimals));
	});

	const onConfirm = async () => {
		if (!selectedToken || parsedAmount <= ZERO || !$authIdentity) {
			return;
		}

		error = undefined;
		goToStep(WizardStepsTip.CREATING);

		const expiresAtNs =
			nowInBigIntNanoSeconds() + BigInt(expiryHours) * 60n * NANO_SECONDS_IN_MINUTE;

		const result = await createAndFundTip({
			identity: $authIdentity,
			amount: parsedAmount,
			token: selectedToken,
			title: title || undefined,
			note: note || undefined,
			expiresAtNs
		});

		if (result.success) {
			const { shareData } = result;
			tipWizardStore.setShareData(shareData);
			tipUrl = `${window.location.origin}/?tip=${shareData.dealId}&claim=${shareData.claimCode}`;
			goToStep(WizardStepsTip.SHARE);
		} else {
			({ error } = result);
			goToStep(WizardStepsTip.REVIEW);
		}
	};
</script>

<WizardModal
	bind:this={modal}
	disablePointerEvents={currentStep?.name === WizardStepsTip.CREATING}
	onClose={close}
	{steps}
	bind:currentStep
>
	{#snippet title()}{currentStep?.title ?? ''}{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsTip.TOKENS_LIST}
			<ModalTokensList
				networkSelectorViewOnly={nonNullish($selectedNetwork)}
				onTokenButtonClick={onSelectToken}
			>
				{#snippet tokenListItem(token, onClick)}
					<ModalTokensListItem {onClick} {token} />
				{/snippet}
				{#snippet noResults()}
					<p class="text-primary">No tokens available</p>
				{/snippet}
				{#snippet toolbar()}
					<ButtonCloseModal />
				{/snippet}
			</ModalTokensList>
		{:else if currentStep?.name === WizardStepsTip.AMOUNT}
			<ContentWithToolbar>
				<div class="flex flex-col gap-4 px-4 pb-4">
					{#if nonNullish(selectedToken)}
						<div class="bg-dust flex items-center gap-2 rounded-lg p-3">
							<span class="font-bold">{selectedToken.symbol}</span>
							<span class="text-tertiary">{selectedToken.name}</span>
						</div>
					{/if}

					<label class="flex flex-col gap-1">
						<span class="text-sm font-semibold">{$i18n.tip.text.tip_amount}</span>
						<input
							class="input"
							min="0"
							placeholder="0.00"
							step="any"
							type="number"
							bind:value={amount}
						/>
					</label>

					<label class="flex flex-col gap-1">
						<span class="text-sm text-tertiary">{$i18n.tip.text.title_label}</span>
						<input
							class="input"
							maxlength="100"
							placeholder={$i18n.tip.text.title_placeholder}
							type="text"
							bind:value={title}
						/>
					</label>

					<label class="flex flex-col gap-1">
						<span class="text-sm text-tertiary">{$i18n.tip.text.note_label}</span>
						<textarea
							class="input"
							maxlength="500"
							placeholder={$i18n.tip.text.note_placeholder}
							rows="2"
							bind:value={note}
						></textarea>
					</label>

					<label class="flex flex-col gap-1">
						<span class="text-sm text-tertiary">{$i18n.tip.text.expiry}</span>
						<select class="input" bind:value={expiryHours}>
							<option value={24}>{$i18n.tip.text.expiry_24h}</option>
							<option value={48}>{$i18n.tip.text.expiry_48h}</option>
							<option value={168}>{$i18n.tip.text.expiry_7d}</option>
						</select>
					</label>
				</div>

				{#snippet toolbar()}
					<div class="flex w-full gap-2">
						<button class="secondary flex-1" onclick={() => goToStep(WizardStepsTip.TOKENS_LIST)}>
							{$i18n.core.text.back}
						</button>
						<button
							class="primary flex-1"
							disabled={!amount || Number(amount) <= 0}
							onclick={onAmountNext}
						>
							{$i18n.core.text.next}
						</button>
					</div>
				{/snippet}
			</ContentWithToolbar>
		{:else if currentStep?.name === WizardStepsTip.REVIEW}
			<ContentWithToolbar>
				<div class="flex flex-col gap-4 px-4 pb-4">
					{#if nonNullish(error)}
						<div class="text-error rounded-lg bg-error-light p-3 text-sm">
							{error}
						</div>
					{/if}

					<div class="bg-dust flex flex-col gap-3 rounded-lg p-4">
						<div class="flex justify-between">
							<span class="text-tertiary">{$i18n.tip.text.tip_amount}</span>
							<span class="font-bold">{amount} {selectedToken?.symbol ?? ''}</span>
						</div>
						{#if title}
							<div class="flex justify-between">
								<span class="text-tertiary">{$i18n.tip.text.title_label}</span>
								<span>{title}</span>
							</div>
						{/if}
						{#if note}
							<div class="flex justify-between">
								<span class="text-tertiary">{$i18n.tip.text.note_label}</span>
								<span class="max-w-[60%] text-right">{note}</span>
							</div>
						{/if}
						<div class="flex justify-between">
							<span class="text-tertiary">{$i18n.tip.text.expiry}</span>
							<span>
								{expiryHours === 24
									? $i18n.tip.text.expiry_24h
									: expiryHours === 48
										? $i18n.tip.text.expiry_48h
										: $i18n.tip.text.expiry_7d}
							</span>
						</div>
					</div>
				</div>

				{#snippet toolbar()}
					<div class="flex w-full gap-2">
						<button class="secondary flex-1" onclick={() => goToStep(WizardStepsTip.AMOUNT)}>
							{$i18n.core.text.back}
						</button>
						<button class="primary flex-1" onclick={onConfirm}>
							{$i18n.tip.text.send_tip}
						</button>
					</div>
				{/snippet}
			</ContentWithToolbar>
		{:else if currentStep?.name === WizardStepsTip.CREATING}
			<ContentWithToolbar>
				<div class="flex flex-col items-center justify-center gap-4 py-16">
					<Spinner />
					<p class="text-tertiary">{$i18n.tip.text.creating}</p>
				</div>

				{#snippet toolbar()}
					<div></div>
				{/snippet}
			</ContentWithToolbar>
		{:else if currentStep?.name === WizardStepsTip.SHARE}
			<ContentWithToolbar>
				{#if nonNullish(tipUrl)}
					<div
						class="mx-auto mb-8 aspect-square h-80 max-h-[44vh] max-w-full rounded-xl bg-white p-4"
					>
						<QRCode value={tipUrl} />
					</div>

					<p class="mb-4 text-center text-sm text-tertiary">
						{$i18n.tip.text.share_description}
					</p>

					<div
						class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle-20 px-3 py-2"
					>
						<output class="text-sm break-all">{tipUrl}</output>
						<div class="flex gap-4">
							<ShareButton shareAriaLabel={tipUrl} />
							<ReceiveCopy address={tipUrl} copyAriaLabel={$i18n.tip.text.link_copied} />
						</div>
					</div>
				{/if}

				{#snippet toolbar()}
					<ButtonCloseModal isPrimary />
				{/snippet}
			</ContentWithToolbar>
		{/if}
	{/key}
</WizardModal>
