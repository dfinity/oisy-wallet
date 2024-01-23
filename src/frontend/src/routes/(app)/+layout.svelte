<script lang="ts">
	import Loader from '$lib/components/core/Loader.svelte';
	import Hero from '$lib/components/hero/Hero.svelte';
	import { isRouteSettings, isRouteTransactions } from '$lib/utils/nav.utils';
	import { page } from '$app/stores';
	import AirdropButton from '$lib/components/airdrop/AirdropButton.svelte';
	import { airdropAvailable } from '$lib/derived/airdrop.derived';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { token, tokenStandard } from '$lib/derived/token.derived';
	import Workers from '$lib/components/core/Workers.svelte';
	import AddressGuard from '$lib/components/guard/AddressGuard.svelte';
	import { networkICP } from '$lib/derived/network.derived';

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
	erc20IcpLink={isErc20Icp($token)}
	convertEth={route === 'transactions' && $tokenStandard === 'ethereum'}
	background={$networkICP ? 'icp' : 'eth'}
/>

<main>
	<AddressGuard>
		<Loader>
			<Workers>
				{#if $airdropAvailable}
					<AirdropButton />
				{/if}

				<slot />
			</Workers>
		</Loader>
	</AddressGuard>
</main>
