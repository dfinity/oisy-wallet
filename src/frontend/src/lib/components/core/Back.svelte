<script lang="ts">
	import { IconBack } from '@dfinity/gix-components';
	import { back } from '$lib/utils/nav.utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { nonNullish } from '@dfinity/utils';
	import { networkId } from '$lib/derived/network.derived';

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<button
	class="flex gap-0.5 text-white font-bold pointer-events-auto"
	on:click={async () => back({ pop: nonNullish(fromRoute), networkId: $networkId })}
	><IconBack /> Back to Wallet</button
>
