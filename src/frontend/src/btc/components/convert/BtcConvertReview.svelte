<script lang="ts">
	import type { Snippet } from 'svelte';
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		cancel?: Snippet;
	}

	let { sendAmount, receiveAmount, cancel }: Props = $props();

	const cancel_render = $derived(cancel);
</script>

<ConvertReview on:icConvert on:icBack {sendAmount} {receiveAmount}>
	{#snippet fee()}
		<BtcConvertFees />
	{/snippet}

	<!-- @migration-task: migrate this slot by hand, `info-message` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `info-message` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `info-message` is an invalid identifier -->
	<div slot="info-message" class="mt-4">
		<MessageBox>{$i18n.convert.text.conversion_may_take}</MessageBox>
	</div>

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</ConvertReview>
