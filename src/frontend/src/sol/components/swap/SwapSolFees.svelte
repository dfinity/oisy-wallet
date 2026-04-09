<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		networkFee?: bigint;
		ataFee?: bigint;
		symbol: string;
	}

	let { networkFee, ataFee, symbol }: Props = $props();

	let totalFee = $derived(nonNullish(networkFee) ? networkFee + (ataFee ?? ZERO) : undefined);
</script>

{#if nonNullish(networkFee)}
	{#if nonNullish(ataFee) && ataFee > ZERO}
		<ModalExpandableValues>
			{#snippet listHeader()}
				<FeeDisplay
					decimals={SOLANA_DEFAULT_DECIMALS}
					displayExchangeRate={false}
					feeAmount={totalFee}
					{symbol}
				>
					{#snippet label()}
						<span>{$i18n.fee.text.total_fee}</span>
					{/snippet}
				</FeeDisplay>
			{/snippet}

			{#snippet listItems()}
				<FeeDisplay
					decimals={SOLANA_DEFAULT_DECIMALS}
					displayExchangeRate={false}
					feeAmount={networkFee}
					{symbol}
				>
					{#snippet label()}
						<span>{$i18n.fee.text.network_fee}</span>
					{/snippet}
				</FeeDisplay>

				<FeeDisplay
					decimals={SOLANA_DEFAULT_DECIMALS}
					displayExchangeRate={false}
					feeAmount={ataFee}
					{symbol}
				>
					{#snippet label()}
						<span>{$i18n.fee.text.ata_fee}</span>
					{/snippet}
				</FeeDisplay>
			{/snippet}
		</ModalExpandableValues>
	{:else}
		<FeeDisplay
			decimals={SOLANA_DEFAULT_DECIMALS}
			displayExchangeRate={false}
			feeAmount={networkFee}
			{symbol}
		>
			{#snippet label()}
				<span>{$i18n.fee.text.network_fee}</span>
			{/snippet}
		</FeeDisplay>
	{/if}
{/if}
