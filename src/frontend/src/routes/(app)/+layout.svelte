<script lang="ts">
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import { isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import AirdropButton from '$airdrop/components/airdrop/AirdropButton.svelte';
	import { airdropAvailable } from '$airdrop/derived/airdrop.derived';
	import Workers from '$lib/components/core/Workers.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import LoaderBalances from '$lib/components/core/LoaderBalances.svelte';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteTransactions($page)
			? 'transactions'
			: 'tokens';
</script>

<Hero
	usdTotal={route === 'tokens'}
	summary={route === 'transactions'}
	send={route === 'transactions'}
	actions={route !== 'settings'}
/>

<main class="pt-12">
	<AddressGuard>
		<Loader>
			<LoaderBalances>
				<Workers>
					{#if $airdropAvailable}
						<AirdropButton />
					{/if}

					<slot />
				</Workers>
			</LoaderBalances>
		</Loader>
	</AddressGuard>
</main>
