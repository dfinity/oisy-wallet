<script lang="ts">
	import type { Snippet } from 'svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		titles: string[];
		logo: Snippet;
		badge: Snippet;
		description: Snippet;
		button: Snippet;
	}

	const { titles, logo, badge, description, button }: Props = $props();
</script>

<div class="flex flex-col rounded-lg border-1 border-disabled bg-disabled p-4">
	<div class="mb-3 flex flex-1 flex-col gap-3 text-sm">
		<span class="flex items-start">
			<span class="flex flex-1">{@render logo()}</span>
			<span
				class="flex min-h-0 flex-0 grow-0 rounded-full border-1 border-tertiary bg-primary px-3 py-1 text-xs whitespace-nowrap"
				>{@render badge()}</span
			>
		</span>

		<h3>
			{#each titles as titlePath, i (`${titlePath}-${i}`)}
				{#if i > 0}
					<Responsive up="md">
						<br />
					</Responsive>
					<Responsive down="sm">
						<span> - </span>
					</Responsive>
				{/if}

				<span>{resolveText({ i18n: $i18n, path: titlePath })}</span>
			{/each}
		</h3>

		<span>{@render description()}</span>
	</div>

	<span>{@render button()}</span>
</div>
