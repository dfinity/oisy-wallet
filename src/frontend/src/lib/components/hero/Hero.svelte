<script lang="ts">
	import { page } from '$app/stores';
	import Header from '$lib/components/hero/Header.svelte';
	import HeroContent from '$lib/components/hero/HeroContent.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import { isRouteTransactions } from '$lib/utils/nav.utils';

	let isTransactions = false;
	$: isTransactions = isRouteTransactions($page);
</script>

<Header />

{#if $authSignedIn && isTransactions}
	<HeroContent />
{/if}
