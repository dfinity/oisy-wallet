<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import type { OptionIcToken } from '$icp/types/ic-token';
	import FeeAmountDisplay from '$icp-eth/components/fee/FeeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const {
		sendToken,
		sendTokenDecimals,
		sendTokenExchangeRate,
		sendBalance,
		sendTokenSymbol,
		sendTokenId
	} = getContext<SendContext>(SEND_CONTEXT_KEY);

	let fee: bigint | undefined;
	$: fee = ($sendToken as OptionIcToken)?.fee;
</script>

{#if nonNullish(fee)}
	<Value ref="fee">
		<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

		<FeeAmountDisplay
			fee={BigNumber.from(fee)}
			feeSymbol={$sendTokenSymbol}
			feeTokenId={$sendTokenId}
			feeDecimals={$sendTokenDecimals}
		/>
	</Value>
{/if}
