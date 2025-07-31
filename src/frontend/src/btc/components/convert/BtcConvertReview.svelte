<script lang="ts">
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
</script>

<ConvertReview {receiveAmount} {sendAmount} on:icConvert on:icBack>
	<BtcConvertFees slot="fee" />

	<div slot="info-message" class="mt-4">
		<MessageBox>{$i18n.convert.text.conversion_may_take}</MessageBox>
	</div>

	<slot name="cancel" slot="cancel" />
</ConvertReview>
