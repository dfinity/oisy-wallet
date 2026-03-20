<script lang="ts">
	import { isTokenIc } from '$icp/utils/icrc.utils';
	import { Modal, Spinner } from '@dfinity/gix-components';
	import { fromNullable, nonNullish } from '@dfinity/utils';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledTokens } from '$lib/derived/tokens.derived';
	import { claimTip } from '$lib/services/tip.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { tipClaimStore } from '$lib/stores/tip.store';
	import { formatToken } from '$lib/utils/format.utils';

	let claiming = $state(false);
	let success = $state(false);
	let claimError = $state<string | undefined>();

	const preview = $derived($tipClaimStore?.preview);
	const dealId = $derived($tipClaimStore?.dealId);
	const claimCode = $derived($tipClaimStore?.claimCode);
	const loadError = $derived($tipClaimStore?.error);

	const previewTitle = $derived(preview ? fromNullable(preview.title) : undefined);
	const previewNote = $derived(preview ? fromNullable(preview.note) : undefined);

	const matchedToken = $derived.by(() => {
		if (!preview) {
			return undefined;
		}
		const ledgerId = preview.token_ledger.toText();
		return $enabledTokens.find((t) => isTokenIc(t) && t.ledgerCanisterId === ledgerId);
	});

	const formattedAmount = $derived.by(() => {
		if (!preview) {
			return '';
		}
		if (nonNullish(matchedToken)) {
			return `${formatToken({ value: preview.amount, unitName: matchedToken.decimals, displayDecimals: matchedToken.decimals })} ${matchedToken.symbol}`;
		}
		return preview.amount.toString();
	});

	const onClaim = async () => {
		if (!dealId || !claimCode || !$authIdentity) {
			return;
		}

		claiming = true;
		claimError = undefined;

		const result = await claimTip({
			identity: $authIdentity,
			dealId,
			claimCode
		});

		claiming = false;

		if (result.success) {
			success = true;
		} else {
			claimError = result.error;
		}
	};

	const onClose = () => {
		tipClaimStore.reset();
		modalStore.close();
	};
</script>

<Modal {onClose}>
	{#snippet title()}
		<span class="text-xl">
			{success ? $i18n.tip.text.claim_success : $i18n.tip.text.claim_title}
		</span>
	{/snippet}

	<ContentWithToolbar>
		{#if nonNullish(loadError)}
			<div class="flex flex-col items-center gap-4 px-4 py-8">
				<p class="text-error text-center">{loadError}</p>
			</div>
		{:else if claiming}
			<div class="flex flex-col items-center justify-center gap-4 py-16">
				<Spinner />
				<p class="text-tertiary">{$i18n.tip.text.claiming}</p>
			</div>
		{:else if success}
			<div class="flex flex-col items-center gap-4 px-4 py-8">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
					<span class="text-3xl">&#10003;</span>
				</div>
				<p class="text-center text-lg font-semibold">{$i18n.tip.text.claim_success}</p>
			</div>
		{:else if nonNullish(preview)}
			<div class="flex flex-col gap-4 px-4 pb-4">
				<p class="text-center text-tertiary">{$i18n.tip.text.claim_description}</p>

				<div class="bg-dust flex flex-col gap-3 rounded-lg p-4">
					<div class="flex justify-between">
						<span class="text-tertiary">{$i18n.tip.text.tip_amount}</span>
						<span class="font-bold">{formattedAmount}</span>
					</div>

					{#if nonNullish(previewTitle)}
						<div class="flex justify-between">
							<span class="text-tertiary">{$i18n.tip.text.title_label}</span>
							<span>{previewTitle}</span>
						</div>
					{/if}

					{#if nonNullish(previewNote)}
						<div class="flex justify-between">
							<span class="text-tertiary">{$i18n.tip.text.note_label}</span>
							<span class="max-w-[60%] text-right">{previewNote}</span>
						</div>
					{/if}

					<div class="flex justify-between">
						<span class="text-tertiary">{$i18n.tip.text.status}</span>
						<span>{Object.keys(preview.status)[0]}</span>
					</div>
				</div>

				{#if nonNullish(claimError)}
					<div class="text-error rounded-lg bg-error-light p-3 text-sm">
						{claimError}
					</div>
				{/if}
			</div>
		{/if}

		{#snippet toolbar()}
			{#if success || nonNullish(loadError)}
				<ButtonCloseModal isPrimary />
			{:else if !claiming && nonNullish(preview)}
				<div class="flex w-full gap-2">
					<button class="secondary flex-1" onclick={onClose}>
						{$i18n.core.text.cancel}
					</button>
					<button class="primary flex-1" onclick={onClaim}>
						{$i18n.tip.text.claim_button}
					</button>
				</div>
			{:else}
				<div></div>
			{/if}
		{/snippet}
	</ContentWithToolbar>
</Modal>
