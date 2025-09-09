<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders, resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		tags?: string[];
		dAppName: string;
	}

	let { tags = [], dAppName }: Props = $props();
</script>

<ul
	class="flex list-none flex-wrap gap-2"
	aria-label={replacePlaceholders($i18n.dapps.alt.tags, {
		$dAppName: resolveText({ i18n: $i18n, path: dAppName })
	})}
>
	{#each tags as tag (tag)}
		<li class="flex">
			<Badge>
				{resolveText({ i18n: $i18n, path: tag })}
			</Badge>
		</li>
	{/each}
</ul>
