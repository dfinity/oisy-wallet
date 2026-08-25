<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		logo?: string;
		symbol?: string;
	}

	let { logo, symbol }: Props = $props();
</script>

<!--
	Stands in for the drawn illustration, which the Figma page composes from
	layers rather than exporting as an asset. The token's own logo carries the
	"what am I being given" signal, so the panel is right for any ICRC-2 ledger
	without shipping a per-token image — including one added after this ships.

	The symbol is spelled out when a ledger publishes no `icrc1:logo` (the plain
	ICP ledger is one). `Logo`'s own fallback is a bare coloured circle, which
	tells the reader nothing at this size.
-->
<div
	class="mb-6 flex h-40 w-full items-center justify-center rounded-2xl bg-brand-subtle-10"
	aria-label={$i18n.tip.alt.claim_illustration}
	role="img"
>
	{#if nonNullish(logo) && notEmptyString(logo)}
		<Logo alt={symbol ?? ''} ring size="xl" src={logo} />
	{:else if nonNullish(symbol) && notEmptyString(symbol)}
		<span
			class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary px-1 text-sm font-bold text-primary-inverted"
		>
			{symbol}
		</span>
	{/if}
</div>
