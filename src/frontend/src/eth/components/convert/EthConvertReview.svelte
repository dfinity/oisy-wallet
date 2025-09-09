<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { type Snippet, getContext } from 'svelte';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';
	import { isTokenErc20 } from '$eth/utils/erc20.utils';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		cancel?: Snippet;
	}

	let { sendAmount, receiveAmount, cancel }: Props = $props();

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const cancel_render = $derived(cancel);
</script>

<ConvertReview {receiveAmount} {sendAmount} on:icConvert on:icBack>
	<EthFeeDisplay slot="fee">
		{#snippet label()}
			<Html text={$i18n.fee.text.convert_fee} />
		{/snippet}
	</EthFeeDisplay>

	<!-- @migration-task: migrate this slot by hand, `info-message` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `info-message` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `info-message` is an invalid identifier -->
	<div slot="info-message" class="mt-4">
		<MessageBox>
			{isTokenErc20($sourceToken)
				? replacePlaceholders($i18n.convert.text.ckerc20_conversions_may_take, {
						$ckErc20: $destinationToken.symbol
					})
				: $i18n.convert.text.cketh_conversions_may_take}
		</MessageBox>
	</div>

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</ConvertReview>
