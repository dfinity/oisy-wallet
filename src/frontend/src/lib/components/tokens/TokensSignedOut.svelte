<script lang="ts">
	import { onMount } from 'svelte';
	import { unsafeLoadDefaultPublicIcrcTokens } from '$icp/services/icrc.services';
	import TokenCardSignedOut from '$lib/components/tokens/TokenCardSignedOut.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { combinedDerivedSortedNetworkTokens } from '$lib/derived/network-tokens.derived';

	onMount(unsafeLoadDefaultPublicIcrcTokens);
</script>

<div class="mb-3 flex flex-col gap-3">
	{#each $combinedDerivedSortedNetworkTokens as token (token.id)}
		<TokenCardWithUrl {token} disableTabSelector>
			<TokenCardSignedOut {token} />
		</TokenCardWithUrl>
	{/each}
</div>
