<script lang="ts">
	import type { Snippet } from 'svelte';
	import shocked from '$lib/assets/shocked.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		title?: string;
		description?: Snippet;
		action?: Snippet;
	}

	let { title, description, action }: Props = $props();
</script>

<div class="py-12">
	<div class="mb-2 flex justify-center p-2">
		<span class="z-0 -mr-4">
			<Img height="64" src={shocked} width="64"></Img>
		</span>
	</div>

	<div class="space-y-4">
		<p class="m-0 text-center text-lg font-bold">
			{title ?? $i18n.tokens.text.filter_nothing_found}
		</p>
		{#if description}
			{@render description()}
		{:else}
			<p class="m-0 text-center text-tertiary">
				{$i18n.tokens.text.filter_nothing_found_description}
			</p>
		{/if}
	</div>

	{#if action}
		{@render action()}
	{/if}
</div>
