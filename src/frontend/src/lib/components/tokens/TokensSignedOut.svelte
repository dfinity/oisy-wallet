<script lang="ts">
	import { combinedDerivedSortedNetworkTokens } from '$lib/derived/network-tokens.derived';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { onMount } from 'svelte';
	import { unsafeLoadDefaultPublicIcrcTokens } from '$icp/services/icrc.services';
	import TokenCardSignedOut from '$lib/components/tokens/TokenCardSignedOut.svelte';

	onMount(unsafeLoadDefaultPublicIcrcTokens);
</script>

{#each $combinedDerivedSortedNetworkTokens as token (token.id)}
	<TokenCardWithUrl {token} disableTabSelector>
		<TokenCardSignedOut {token} />
	</TokenCardWithUrl>
{/each}
