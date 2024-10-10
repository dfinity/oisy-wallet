<script lang="ts">
	import { IconBack } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import { i18n } from '$lib/stores/i18n.store';
	import { back } from '$lib/utils/nav.utils';

	export let color: 'primary' | 'current' = 'primary';

	let fromRoute: NavigationTarget | null;

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<button
	class={`text-${color} pointer-events-auto flex gap-0.5 font-bold`}
	on:click={async () => back({ pop: nonNullish(fromRoute) })}
	><IconBack /> {$i18n.core.text.back}</button
>
