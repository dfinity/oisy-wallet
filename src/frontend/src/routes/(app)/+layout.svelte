<script lang="ts">
	import { page } from '$app/stores';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
	import Footer from '$lib/components/core/Footer.svelte';
	import LoadersGuard from '$lib/components/core/LoadersGuard.svelte';
	import Modals from '$lib/components/core/Modals.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { token } from '$lib/stores/token.store';
	import { isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';

	let route: 'transactions' | 'tokens' | 'settings' = 'tokens';
	$: route = isRouteSettings($page)
		? 'settings'
		: isRouteTransactions($page)
			? 'transactions'
			: 'tokens';

	$: token.set($pageToken);
</script>

<div class="min-h-[640px] md:flex md:h-full md:flex-col" class:overflow-hidden={$authNotSignedIn}>
	<Hero
		usdTotal={route === 'tokens'}
		summary={route === 'transactions'}
		actions={route !== 'settings'}
		back={route === 'settings' ? 'header' : route === 'transactions' ? 'hero' : undefined}
	/>

	<AuthGuard>
		<main class=" pt-8">
			<LoadersGuard>
				<slot />
			</LoadersGuard>
		</main>

		<Modals />
	</AuthGuard>

	<Footer />
</div>
