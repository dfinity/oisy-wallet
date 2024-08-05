<script lang="ts">
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived.js';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import { onMount } from 'svelte';
	import { unsafeLoadDefaultPublicIcrcTokens } from '$icp/services/icrc.services';
	import TokenCardSignedOut from '$lib/components/tokens/TokenCardSignedOut.svelte';

	onMount(unsafeLoadDefaultPublicIcrcTokens);
</script>

{#each $enabledNetworkTokens as token (token.id)}
	<TokenCardWithUrl {token}>
		<TokenCardSignedOut {token} />
	</TokenCardWithUrl>
{/each}
