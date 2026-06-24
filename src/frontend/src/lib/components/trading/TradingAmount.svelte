<script lang="ts">
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import { isPrivacyMode } from '$lib/derived/settings.derived';

	interface Props {
		amount: bigint;
		decimals: number;
		symbol: string;
	}

	let { amount, decimals, symbol }: Props = $props();
</script>

{#if $isPrivacyMode}
	<span class="inline-flex items-center gap-1">
		<IconDots times={3} variant="xs" />
		{symbol}
	</span>
{:else}
	<Amount {amount} {decimals} {symbol} />
{/if}
