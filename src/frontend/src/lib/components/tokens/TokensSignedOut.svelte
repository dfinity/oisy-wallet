<script lang="ts">
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived.js';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
</script>

{#each $enabledNetworkTokens as token (token.id)}
	<TokenCard {token}>
		<span class="break-all" slot="description">
			-/- {token.symbol}
		</span>

		<span slot="actions" class="mr-[3px] font-bold">-/-</span>
	</TokenCard>
{/each}
