<script lang="ts">
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived.js';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { onMount } from 'svelte';
	import { unsafeLoadDefaultPublicIcrcTokens } from '$icp/services/icrc.services';

	onMount(unsafeLoadDefaultPublicIcrcTokens);
</script>

{#each $enabledNetworkTokens as token (token.id)}
	<TokenCardWithUrl {token}>
		<span class="break-all" slot="description">
			-/- {token.symbol}
		</span>

		<span slot="actions" class="mr-[3px] font-bold">-/-</span>
	</TokenCardWithUrl>
{/each}
