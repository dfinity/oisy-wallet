<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils.js';

	interface Props {
		items: { label: string; url: string }[];
	}

	const { items }: Props = $props();
</script>

<div class="flex gap-2 text-xs font-bold">
	{#each items as item, index (item.url + index)}
		<a class="text-brand-primary no-underline" href={item.url}
			>{shortenWithMiddleEllipsis({ text: item.label, splitLength: 10 })}</a
		><span>/</span>
	{/each}
</div>
