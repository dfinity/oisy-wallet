<script lang="ts">
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { isRouteTransactions, networkUrl } from '$lib/utils/nav.utils.js';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { networkId } from '$lib/derived/network.derived.js';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';

	let fromRoute = $state<NavigationTarget | null>(null);

	const isTransactionsRoute = $derived(isRouteTransactions(page));

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<div class="flex flex-col">
	<PageTitle>{$i18n.earning.text.title}</PageTitle>

	<!-- Todo: refactor this once the design is clear -->

	<div class="grid grid-cols-3 gap-3">
		<div class="flex flex-col items-center rounded-2xl bg-disabled-alt p-3 text-center">
			<span class="py-2">
				<IconCrypto />
			</span>
			<span class="inline-flex font-bold">Gold</span>
			<span class="inline-flex text-tertiary">Coming soon </span>
		</div>
		<a
			class="flex flex-col items-center rounded-2xl bg-brand-subtle-20 p-3 text-center no-underline hover:bg-brand-subtle-30 hover:text-primary hover:shadow"
			href={networkUrl({
				path: AppPath.EarningRewards,
				networkId: $networkId,
				usePreviousRoute: isTransactionsRoute,
				fromRoute
			})}
		>
			<span class="py-2">
				<IconGift />
			</span>
			<span class="inline-flex font-bold">Sprinkles</span>
			<span class="inline-flex text-tertiary">OISY Rewards</span>
		</a>
		<div class="flex flex-col items-center rounded-2xl bg-disabled-alt p-3 text-center">
			<span class="py-2">
				<IconCrypto />
			</span>
			<span class="inline-flex font-bold">Stablecoins</span>
			<span class="inline-flex text-tertiary">Coming soon</span>
		</div>
	</div>
</div>
