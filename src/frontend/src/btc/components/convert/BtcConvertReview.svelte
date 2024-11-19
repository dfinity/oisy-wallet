<script lang="ts">
	import { Collapsible } from '@dfinity/gix-components';
	import BtcConvertFeeTotal from '$btc/components/convert/BtcConvertFeeTotal.svelte';
	import BtcConvertFees from '$btc/components/convert/BtcConvertFees.svelte';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
</script>

<ConvertReview on:icConvert on:icBack {sendAmount} {receiveAmount}>
	<div class="btc-convert-review-fees" slot="fee">
		<Collapsible>
			<!-- The width of the item below should be 100% - collapsible expand button width (1.5rem) -->
			<div class="flex w-[calc(100%-1.5rem)] items-center" slot="header">
				<BtcConvertFeeTotal />
			</div>

			<BtcConvertFees {sendAmount} />
		</Collapsible>
	</div>

	<div slot="info-message" class="mt-4">
		<MessageBox>{$i18n.convert.text.conversion_may_take}</MessageBox>
	</div>

	<slot name="cancel" slot="cancel" />
</ConvertReview>

<style lang="scss">
	:global(.btc-convert-review-fees > div.contents > div.header > button.collapsible-expand-icon) {
		justify-content: flex-end;
	}
</style>
