<script lang="ts">
	import { Collapsible } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { formatTokenBigintToNumber, formatUSD } from '$lib/utils/format.utils';

	const { destinationToken, destinationTokenExchangeRate, sourceToken, sourceTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let liquidityProvidersFee: number;
	$: liquidityProvidersFee = nonNullish($destinationToken)
		? formatTokenBigintToNumber({
				value: $swapAmountsStore?.swapAmounts?.liquidityProvidersFee ?? 0n,
				displayDecimals: $destinationToken.decimals,
				unitName: $destinationToken.decimals
			})
		: 0;

	let gasFee: number;
	$: gasFee = nonNullish($destinationToken)
		? formatTokenBigintToNumber({
				value: $swapAmountsStore?.swapAmounts?.gasFee ?? 0n,
				displayDecimals: $destinationToken.decimals,
				unitName: $destinationToken.decimals
			})
		: 0;

	let sourceTokenFee: number;
	$: sourceTokenFee =
		nonNullish($sourceToken) && nonNullish($sourceToken.fee)
			? formatTokenBigintToNumber({
					value: $sourceToken.fee,
					displayDecimals: $sourceToken.decimals,
					unitName: $sourceToken.decimals
				})
			: 0;

	let destinationTokenTotalFeeUSD: number;
	$: destinationTokenTotalFeeUSD = nonNullish($destinationTokenExchangeRate)
		? (liquidityProvidersFee + gasFee) * $destinationTokenExchangeRate
		: 0;

	let sourceTokenTotalFeeUSD: number;
	$: sourceTokenTotalFeeUSD = nonNullish($sourceTokenExchangeRate)
		? sourceTokenFee * $sourceTokenExchangeRate
		: 0;
</script>

{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
	<div in:fade class="swap-fees">
		<Collapsible>
			<!-- The width of the item below should be 100% - collapsible expand button width (1.5rem) -->
			<div class="flex w-[calc(100%-1.5rem)] items-center" slot="header">
				<ModalValue>
					<svelte:fragment slot="label">{$i18n.swap.text.total_fee}</svelte:fragment>

					<svelte:fragment slot="main-value">
						{#if destinationTokenTotalFeeUSD + sourceTokenTotalFeeUSD < SWAP_TOTAL_FEE_THRESHOLD}
							{`< ${formatUSD({
								value: SWAP_TOTAL_FEE_THRESHOLD
							})}`}
						{:else}
							{formatUSD({
								value: destinationTokenTotalFeeUSD + sourceTokenTotalFeeUSD
							})}
						{/if}
					</svelte:fragment>
				</ModalValue>
			</div>

			{#if nonNullish(sourceTokenFee)}
				<ModalValue>
					<svelte:fragment slot="label">{$i18n.swap.text.token_fee}</svelte:fragment>

					<svelte:fragment slot="main-value">
						{sourceTokenFee}
						{$sourceToken.symbol}
					</svelte:fragment>
				</ModalValue>
			{/if}

			<ModalValue>
				<svelte:fragment slot="label">{$i18n.swap.text.gas_fee}</svelte:fragment>

				<svelte:fragment slot="main-value">
					{gasFee}
					{$destinationToken.symbol}
				</svelte:fragment>
			</ModalValue>

			<ModalValue>
				<svelte:fragment slot="label">{$i18n.swap.text.lp_fee}</svelte:fragment>

				<svelte:fragment slot="main-value">
					{liquidityProvidersFee}
					{$destinationToken.symbol}
				</svelte:fragment>
			</ModalValue>
		</Collapsible>
	</div>
{/if}

<style lang="scss">
	:global(.swap-fees > div.contents > div.header > button.collapsible-expand-icon) {
		justify-content: flex-end;
	}
</style>
