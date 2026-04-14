<script lang="ts">
	import { Modal, QRCode } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import ReceiveCopy from '$lib/components/receive/ReceiveCopy.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledIcTokens } from '$lib/derived/tokens.derived';
	import { createGiftCode } from '$lib/services/gift-code.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	type Step = 'select-token' | 'select-expiry' | 'review' | 'creating' | 'success';

	let step: Step = $state('select-token');
	let selectedToken: IcToken | undefined = $state(undefined);
	let amount: number | undefined = $state(undefined);
	let expirySeconds: bigint = $state(86400n);
	let createdCode: string | undefined = $state(undefined);

	const expiryOptions: { label: string; value: bigint }[] = [
		{ label: $i18n.gift_code.create.text.expiry_1h, value: 3600n },
		{ label: $i18n.gift_code.create.text.expiry_24h, value: 86400n },
		{ label: $i18n.gift_code.create.text.expiry_7d, value: 604800n },
		{ label: $i18n.gift_code.create.text.expiry_30d, value: 2592000n }
	];

	const selectedExpiryLabel = $derived(
		expiryOptions.find((o) => o.value === expirySeconds)?.label ?? ''
	);

	const amountBigInt = $derived.by(() => {
		if (isNullish(amount) || isNullish(selectedToken)) {
			return ZERO;
		}
		return BigInt(Math.floor(amount * 10 ** selectedToken.decimals));
	});

	const canProceedFromToken = $derived(
		nonNullish(selectedToken) && nonNullish(amount) && amount > 0
	);

	const goToExpiry = () => {
		if (canProceedFromToken) {
			step = 'select-expiry';
		}
	};

	const goToReview = () => {
		step = 'review';
	};

	const goBack = () => {
		if (step === 'select-expiry') {
			step = 'select-token';
		} else if (step === 'review') {
			step = 'select-expiry';
		}
	};

	const handleCreate = async () => {
		if (isNullish($authIdentity) || isNullish(selectedToken) || isNullish(amount)) {
			return;
		}

		step = 'creating';

		const result = await createGiftCode({
			identity: $authIdentity,
			ledgerCanisterId: selectedToken.ledgerCanisterId,
			amount: amountBigInt,
			expirySeconds
		});

		if (result.success && nonNullish(result.code)) {
			createdCode = result.code;
			step = 'success';
		} else {
			step = 'review';
		}
	};

	const qrCodeUrl = $derived(
		nonNullish(createdCode) ? `${window.location.origin}/?gift=${createdCode}` : ''
	);
</script>

<Modal onClose={modalStore.close}>
	{#snippet title()}
		<span class="text-xl">{$i18n.gift_code.create.text.title}</span>
	{/snippet}

	<ContentWithToolbar>
		{#if step === 'select-token'}
			<div class="flex flex-col gap-4">
				<p class="text-secondary">{$i18n.gift_code.create.text.select_token}</p>

				<div class="flex flex-col gap-2">
					{#each $enabledIcTokens as token (token.ledgerCanisterId)}
						<button
							class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors
								{selectedToken?.ledgerCanisterId === token.ledgerCanisterId
								? 'border-primary bg-brand-subtle-20'
								: 'hover:bg-dust border-transparent'}"
							onclick={() => (selectedToken = token)}
						>
							<span class="font-bold">{token.symbol}</span>
							<span class="text-sm text-secondary">{token.name}</span>
						</button>
					{/each}
				</div>

				{#if nonNullish(selectedToken)}
					<InputCurrency
						name="gift-amount"
						decimals={selectedToken.decimals}
						onBlur={() => {}}
						onFocus={() => {}}
						onInput={() => {}}
						placeholder="0"
						bind:value={amount}
					/>
				{/if}
			</div>
		{:else if step === 'select-expiry'}
			<div class="flex flex-col gap-4">
				<p class="text-secondary">{$i18n.gift_code.create.text.select_expiry}</p>

				<div class="flex flex-col gap-2">
					{#each expiryOptions as option (option.value)}
						<button
							class="rounded-lg border p-3 text-left transition-colors
								{expirySeconds === option.value
								? 'border-primary bg-brand-subtle-20'
								: 'hover:bg-dust border-transparent'}"
							onclick={() => (expirySeconds = option.value)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
		{:else if step === 'review'}
			<div class="flex flex-col gap-4">
				<h3 class="text-center">{$i18n.gift_code.create.text.review_title}</h3>

				<div class="bg-dust flex flex-col gap-2 rounded-lg p-4">
					<div class="flex justify-between">
						<span class="text-secondary">{$i18n.gift_code.create.text.review_token}</span>
						<span class="font-bold">{selectedToken?.symbol}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-secondary">{$i18n.gift_code.create.text.review_amount}</span>
						<span class="font-bold">{amount}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-secondary">{$i18n.gift_code.create.text.review_expiry}</span>
						<span class="font-bold">{selectedExpiryLabel}</span>
					</div>
				</div>
			</div>
		{:else if step === 'creating'}
			<div class="flex flex-col items-center gap-4 py-8">
				<div class="animate-spin text-4xl">&#9696;</div>
				<p class="text-secondary">
					{$i18n.gift_code.create.text.creating}
				</p>
			</div>
		{:else if step === 'success'}
			<div class="flex flex-col items-center gap-4">
				<p class="text-center text-secondary">
					{$i18n.gift_code.create.text.success_description}
				</p>

				<div class="mx-auto aspect-square h-64 max-h-[40vh] max-w-full rounded-xl bg-white p-4">
					{#if nonNullish(createdCode)}
						<QRCode value={qrCodeUrl} />
					{/if}
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
			</div>
		{/if}

		{#snippet toolbar()}
			{#if step === 'select-token'}
				<ButtonGroup>
					<ButtonCloseModal />
					<Button
						colorStyle="primary"
						disabled={!canProceedFromToken}
						fullWidth
						onclick={goToExpiry}
						paddingSmall
						type="button"
					>
						{$i18n.core.text.next}
					</Button>
				</ButtonGroup>
			{:else if step === 'select-expiry'}
				<ButtonGroup>
					<Button
						colorStyle="secondary-light"
						fullWidth
						onclick={goBack}
						paddingSmall
						type="button"
					>
						{$i18n.core.text.back}
					</Button>
					<Button colorStyle="primary" fullWidth onclick={goToReview} paddingSmall type="button">
						{$i18n.core.text.next}
					</Button>
				</ButtonGroup>
			{:else if step === 'review'}
				<ButtonGroup>
					<Button
						colorStyle="secondary-light"
						fullWidth
						onclick={goBack}
						paddingSmall
						type="button"
					>
						{$i18n.core.text.back}
					</Button>
					<Button colorStyle="primary" fullWidth onclick={handleCreate} paddingSmall type="button">
						{$i18n.gift_code.create.text.confirm}
					</Button>
				</ButtonGroup>
			{:else if step === 'success'}
				<ButtonGroup>
					<ButtonCloseModal />
				</ButtonGroup>
			{/if}
		{/snippet}
	</ContentWithToolbar>
</Modal>
