<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let tags: string[] = [];
	export let dAppName: string;
</script>

<ul
	aria-label={replacePlaceholders($i18n.dapps.alt.tags, { $dAppName: dAppName })}
	class="flex list-none flex-wrap gap-2"
>
	{#each tags as tag}
		<li class="flex">
			<Badge>
				{tag}
			</Badge>
		</li>
	{/each}
</ul>
