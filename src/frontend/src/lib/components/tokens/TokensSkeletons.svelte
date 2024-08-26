<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { fade } from 'svelte/transition';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { TOKENS_SKELETONS_INITIALIZED } from '$lib/constants/test-ids.constants';
</script>

{#if $erc20UserTokensNotInitialized}
	<SkeletonCards rows={5} />
{:else}
	<div in:fade data-tid={TOKENS_SKELETONS_INITIALIZED}>
		<slot />
	</div>
{/if}
