<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import PaymentStatusHero from '$lib/components/scanner/open-crypto-pay/PaymentStatusHero.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { PAY_CONTEXT_KEY, type PayContext } from '$lib/stores/open-crypto-pay.store';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	const { failedPaymentError } = getContext<PayContext>(PAY_CONTEXT_KEY);
</script>

<ContentWithToolbar styleClass="flex flex-col w-full">
	<PaymentStatusHero status="failure" />

	{#if nonNullish($failedPaymentError)}
		<div class="mt-4">
			<MessageBox level="info">
				{$failedPaymentError}
			</MessageBox>
		</div>
	{/if}

	{#snippet toolbar()}
		<Button fullWidth onclick={onClose}>{$i18n.scanner.text.try_again}</Button>
	{/snippet}
</ContentWithToolbar>
