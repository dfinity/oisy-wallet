<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let tags: string[] = [];
	export let dAppName: string;
</script>

<ul
	aria-label={replacePlaceholders($i18n.dapps.alt.tags, { $dAppname: dAppName })}
	class="flex list-none flex-wrap gap-2"
>
	{#each tags as tag}
		<li class="rounded border border-light-grey bg-dust/30 px-2 py-0.5 text-xs font-semibold">
			{tag}
		</li>
	{/each}
</ul>
