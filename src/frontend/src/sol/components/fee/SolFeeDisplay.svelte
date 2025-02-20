<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';
	import FeeAmountDisplay from "$icp-eth/components/fee/FeeAmountDisplay.svelte";

	const {
		feeStore: fee,
		ataFeeStore: ataFee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	const { sendToken, sendTokenId } =
		getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

{#if nonNullish($fee)}
	<Value ref="fee">
		<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

		<FeeAmountDisplay
				fee={BigNumber.from($fee)}
				feeSymbol={$symbol}
				feeTokenId={$sendTokenId}
				feeDecimals={$decimals}
		/>
	</Value>
{/if}

{#if nonNullish($ataFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="ataFee">
			<svelte:fragment slot="label">{$i18n.fee.text.ata_fee}</svelte:fragment>

			<FeeAmountDisplay
					fee={BigNumber.from($ataFee)}
					feeSymbol={$symbol}
					feeTokenId={$sendTokenId}
					feeDecimals={$decimals}
			/>
		</Value>
	</div>
{/if}
