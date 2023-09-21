<script lang="ts">
	import { IconBack } from '@dfinity/gix-components';
	import { back } from '$lib/utils/nav.utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { nonNullish } from '@dfinity/utils';

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<button
	class="flex gap-0.5 text-white font-bold pointer-events-all"
	on:click={async () => back(nonNullish(fromRoute))}><IconBack /> Back to Wallet</button
>
