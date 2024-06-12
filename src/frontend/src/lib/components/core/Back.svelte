<script lang="ts">
	import { IconBack } from '@dfinity/gix-components';
	import { back } from '$lib/utils/nav.utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { nonNullish } from '@dfinity/utils';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<button
	class="flex gap-0.5 text-white font-bold pointer-events-auto ml-2"
	on:click={async () =>
		back({ pop: nonNullish(fromRoute), networkId: $networkId, fromUrl: fromRoute?.url })}
	><IconBack /> {$i18n.navigation.text.back_to_wallet}</button
>
