<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { getContext, type Snippet } from 'svelte';
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
		receiveAmount?: number;
		onConvert: () => void;
		cancel: Snippet;
	}

	let { sendAmount, receiveAmount, onConvert, cancel }: Props = $props();

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<ConvertReview {cancel} {onConvert} {receiveAmount} {sendAmount}>
	{#snippet fee()}
		<EthFeeDisplay>
			{#snippet label()}
				<Html text={$i18n.fee.text.convert_fee} />
			{/snippet}
		</EthFeeDisplay>
	{/snippet}

	{#snippet infoMessage()}
		<div class="mt-4">
			<MessageBox>
				{isTokenErc20($sourceToken)
					? replacePlaceholders($i18n.convert.text.ckerc20_conversions_may_take, {
							$ckErc20: $destinationToken.symbol
						})
					: $i18n.convert.text.cketh_conversions_may_take}
			</MessageBox>
		</div>
	{/snippet}
</ConvertReview>
