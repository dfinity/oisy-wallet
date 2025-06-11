<script lang="ts">
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { networkId } from '$lib/derived/network.derived.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { networkUrl } from '$lib/utils/nav.utils.js';

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<div class="flex flex-col">
	<PageTitle>{$i18n.earning.text.title}</PageTitle>

	<!-- Todo: refactor this once the design is clear -->
	<!-- we know we want to show these 3 cards, thats why the translations have been added already -->

	<div class="grid grid-cols-3 gap-3">
		<div class="flex flex-col items-center rounded-2xl bg-disabled-alt p-3 text-center">
			<span class="py-2">
				<IconCrypto />
			</span>
			<span class="inline-flex font-bold">{$i18n.earning.cards.gold_title}</span>
			<span class="inline-flex text-tertiary">{$i18n.earning.cards.gold_description}</span>
		</div>
		<a
			class="flex flex-col items-center rounded-2xl bg-brand-subtle-20 p-3 text-center no-underline hover:bg-brand-subtle-30 hover:text-primary hover:shadow"
			href={networkUrl({
				path: AppPath.EarningRewards,
				networkId: $networkId,
				usePreviousRoute: false,
				fromRoute
			})}
		>
			<span class="py-2">
				<IconGift />
			</span>
			<span class="inline-flex font-bold">{$i18n.earning.cards.sprinkles_title}</span>
			<span class="inline-flex text-tertiary">{$i18n.earning.cards.sprinkles_description}</span>
		</a>
		<div class="flex flex-col items-center rounded-2xl bg-disabled-alt p-3 text-center">
			<span class="py-2">
				<IconCrypto />
			</span>
			<span class="inline-flex font-bold">{$i18n.earning.cards.stablecoins_title}</span>
			<span class="inline-flex text-tertiary">{$i18n.earning.cards.stablecoins_description}</span>
		</div>
	</div>
</div>
