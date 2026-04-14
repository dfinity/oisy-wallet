<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import type { QrGiftCodeEntry, QrGiftCodeValidity } from '$declarations/rewards/rewards.did';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { cancelGiftCode, loadMyGiftCodes } from '$lib/services/gift-code.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let codes: QrGiftCodeEntry[] = $state([]);
	let loading = $state(true);
	let selectedCode: QrGiftCodeEntry | undefined = $state(undefined);

	onMount(async () => {
		if (nonNullish($authIdentity)) {
			codes = await loadMyGiftCodes({ identity: $authIdentity });
		}
		loading = false;
	});

	const validityLabel = (validity: QrGiftCodeValidity): string => {
		if ('Valid' in validity) {
			return $i18n.gift_code.list.text.status_valid;
		}
		if ('Used' in validity) {
			return $i18n.gift_code.list.text.status_used;
		}
		if ('Expired' in validity) {
			return $i18n.gift_code.list.text.status_expired;
		}
		if ('Cancelled' in validity) {
			return $i18n.gift_code.list.text.status_cancelled;
		}
		return '';
	};

	const validityColor = (validity: QrGiftCodeValidity): string => {
		if ('Valid' in validity) {
			return 'text-success';
		}
		if ('Used' in validity) {
			return 'text-secondary';
		}
		if ('Expired' in validity) {
			return 'text-warning';
		}
		if ('Cancelled' in validity) {
			return 'text-error';
		}
		return '';
	};

	const isValid = (validity: QrGiftCodeValidity): boolean => 'Valid' in validity;

	const handleCancel = async (code: string) => {
		if (isNullish($authIdentity)) {
			return;
		}

		const result = await cancelGiftCode({ identity: $authIdentity, code });
		if (result.success) {
			codes = await loadMyGiftCodes({ identity: $authIdentity });
			selectedCode = undefined;
		}
	};

	const qrCodeUrl = $derived.by(() => {
		const code = selectedCode;
		return nonNullish(code) ? `${window.location.origin}/?gift=${code.code}` : '';
	});
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		<span class="text-xl">{$i18n.gift_code.list.text.title}</span>
	{/snippet}

	<ContentWithToolbar>
		{#if nonNullish(selectedCode)}
			<div class="flex flex-col items-center gap-4">
				<div class="mx-auto aspect-square h-64 max-h-[40vh] max-w-full rounded-xl bg-white p-4">
					<QRCode value={qrCodeUrl} />
				</div>

				<div
					class="flex w-full items-center justify-between gap-4 rounded-lg bg-brand-subtle-20 px-3 py-2"
				>
					<output class="text-sm break-all">{qrCodeUrl}</output>
					<ReceiveCopy
						address={qrCodeUrl}
						copyAriaLabel={$i18n.gift_code.create.text.link_copied}
					/>
				</div>

				{#if isValid(selectedCode.validity)}
					<Button
						colorStyle="error"
						fullWidth
						onclick={() => handleCancel(selectedCode?.code ?? '')}
						paddingSmall
						type="button"
					>
						{$i18n.gift_code.list.text.cancel_confirm}
					</Button>
				{/if}
			</div>
		{:else if loading}
			<SkeletonText />
		{:else if codes.length === 0}
			<p class="py-8 text-center text-secondary">{$i18n.gift_code.list.text.empty}</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each codes as entry (entry.code)}
					<button
						class="hover:bg-dust flex items-center justify-between rounded-lg border border-transparent p-3 text-left"
						onclick={() => (selectedCode = entry)}
					>
						<div class="flex flex-col">
							<span class="font-mono text-sm"
								>{entry.code.slice(0, 8)}...{entry.code.slice(-4)}</span
							>
							<span class="text-xs text-secondary">
								{entry.tokens.map((t) => t.amount.toString()).join(', ')}
							</span>
						</div>
						<span class="text-sm font-medium {validityColor(entry.validity)}">
							{validityLabel(entry.validity)}
						</span>
					</button>
				{/each}
			</div>
		{/if}

		{#snippet toolbar()}
			{#if nonNullish(selectedCode)}
				<ButtonGroup>
					<Button
						colorStyle="secondary-light"
						fullWidth
						onclick={() => (selectedCode = undefined)}
						paddingSmall
						type="button"
					>
						{$i18n.core.text.back}
					</Button>
				</ButtonGroup>
			{:else}
				<ButtonGroup>
					<ButtonCloseModal />
				</ButtonGroup>
			{/if}
		{/snippet}
	</ContentWithToolbar>
</Modal>
