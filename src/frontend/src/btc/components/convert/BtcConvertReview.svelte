<script lang="ts">
	import type { Snippet } from 'svelte';
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		onConvert: () => void;
		cancel: Snippet;
	}

	let { sendAmount, receiveAmount, onConvert, cancel }: Props = $props();
</script>

<ConvertReview {cancel} {onConvert} {receiveAmount} {sendAmount}>
	{#snippet fee()}
		<BtcConvertFees />
	{/snippet}

	{#snippet infoMessage()}
		<div class="mt-4">
			<MessageBox>{$i18n.convert.text.conversion_may_take}</MessageBox>
		</div>
	{/snippet}
</ConvertReview>
