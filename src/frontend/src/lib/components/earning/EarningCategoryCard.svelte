<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import type { AppPath } from '$lib/constants/routes.constants.js';
	import { networkId } from '$lib/derived/network.derived';
	import { networkUrl } from '$lib/utils/nav.utils.js';

	interface Props {
		title: Snippet;
		description: Snippet;
		icon: Snippet;
		appPath?: AppPath;
		disabled?: boolean;
		testId?: string;
	}

	const { title, description, icon, appPath, disabled = false, testId }: Props = $props();

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<a
	class="transition-bg duration-250 flex flex-col items-center rounded-2xl p-3 text-center text-primary no-underline shadow"
	class:bg-brand-subtle-20={!disabled}
	class:bg-disabled-alt={disabled}
	class:hover:bg-brand-subtle-30={!disabled}
	class:hover:text-primary={!disabled}
	data-tid={testId}
	href={nonNullish(appPath) && !disabled
		? networkUrl({
				path: appPath,
				networkId: $networkId,
				usePreviousRoute: false,
				fromRoute
			})
		: undefined}
>
	<span class="py-2">
		{@render icon()}
	</span>
	<span class="inline-flex font-bold">{@render title()}</span>
	<span class="inline-flex text-tertiary">{@render description()}</span>
</a>
