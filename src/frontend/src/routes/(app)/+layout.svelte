<script lang="ts">
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import { isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import LoaderBalances from '$icp-eth/components/core/LoaderBalances.svelte';
	import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import LoaderMetamask from '$lib/components/core/LoaderMetamask.svelte';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteTransactions($page)
			? 'transactions'
			: 'tokens';

	$: token.set($pageToken);
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
				<ExchangeWorker>
					<LoaderMetamask>
						<slot />
					</LoaderMetamask>
				</ExchangeWorker>
			</LoaderBalances>
		</Loader>
	</AddressGuard>
</main>

<Modals />
