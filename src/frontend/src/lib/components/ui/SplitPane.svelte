<script lang="ts">
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
		menu: Snippet;
		children: Snippet;
	}

	let { menu, children }: Props = $props();
</script>

<main class="max-w-screen-2.5xl relative mx-auto pt-6 md:flex md:w-full md:flex-row lg:w-auto">
	<Responsive up="md">
		<div
			class="1.5xl:w-[22rem] invisible absolute -translate-x-full transition-all duration-200 ease-in-out md:visible md:fixed md:inset-y-0 md:mt-24 md:block md:min-w-36 md:translate-x-0 md:transition-none lg:min-w-44 xl:w-80"
		>
			{@render menu()}
		</div>
	</Responsive>

	<div
		class="mx-auto max-w-xl px-3 md:ml-64 md:box-content md:w-[calc(100%-18rem)] md:px-4 xl:ml-auto"
	>
		{@render children()}
	</div>
</main>
