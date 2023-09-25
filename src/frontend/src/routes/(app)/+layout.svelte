<script lang="ts">
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import { isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import AirdropButton from '$lib/components/airdrop/AirdropButton.svelte';
	import { airdropAvailable } from '$lib/derived/airdrop.derived';
	import AirdropWorker from '$lib/components/airdrop/AirdropWorker.svelte';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteTransactions($page)
		? 'transactions'
		: 'tokens';
</script>

<Hero
	summary={route === 'transactions'}
	send={route === 'transactions'}
	actions={route !== 'settings'}
/>

<main>
	<Loader>
		<AirdropWorker>
			{#if $airdropAvailable}
				<AirdropButton />
			{/if}

			<slot />
		</AirdropWorker>
	</Loader>
</main>
