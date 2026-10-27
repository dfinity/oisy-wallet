<script lang="ts">
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
		menu: Snippet;
		embedded?: boolean;
		children: Snippet;
	}

	let { menu, children, embedded = false }: Props = $props();
</script>

<main class="relative mx-auto max-w-screen-2.5xl pt-6 md:flex md:w-full md:flex-row lg:w-auto">
	{#if !embedded}<Responsive up="md">
			<div
				class="invisible absolute -translate-x-full transition-all duration-200 ease-in-out md:visible md:fixed md:inset-y-0 md:mt-24 md:block md:min-w-36 md:translate-x-0 md:transition-none lg:min-w-44 xl:w-80 1.5xl:w-[22rem]"
			>
				{@render menu()}
			</div>
		</Responsive>{/if}

	<div
		class="mx-auto w-full max-w-xl px-3 md:px-4"
		class:md:box-content={!embedded}
		class:md:ml-64={!embedded}
		class:md:w-[calc(100%-18rem)]={!embedded}
		class:xl:ml-auto={!embedded}
	>
		{@render children()}
	</div>
</main>
