<script lang="ts">
	import { Back } from '@dfinity/gix-components';
	import { back } from '$lib/utils/nav.utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { nonNullish } from '@dfinity/utils';

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<button class="flex gap-0.5 text-white font-bold" on:click={async () => back(nonNullish(fromRoute))}
	><Back /> Back to Wallet</button
>
