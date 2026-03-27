<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		amount?: OptionAmount;
		disabled?: boolean;
		content?: Snippet;
		subtitle?: Snippet;
		onBack?: () => void;
		onClose?: () => void;
		onConfirm: () => void;
		actionButtonLabel: string;
	}

	let {
		amount,
		disabled = false,
		content,
		subtitle,
		onBack,
		onClose,
		onConfirm,
		actionButtonLabel
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<SendTokenReview
		exchangeRate={$sendTokenExchangeRate}
		sendAmount={amount}
		{subtitle}
		token={$sendToken}
	/>

	{@render content?.()}

	{#snippet toolbar()}
		<ButtonGroup testId="toolbar">
			{#if nonNullish(onBack)}
				<ButtonBack onclick={onBack} />
			{:else if nonNullish(onClose)}
				<ButtonCancel onclick={onClose} />
			{/if}

			<Button {disabled} onclick={onConfirm} testId={STAKE_REVIEW_FORM_BUTTON}>
				{actionButtonLabel}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
