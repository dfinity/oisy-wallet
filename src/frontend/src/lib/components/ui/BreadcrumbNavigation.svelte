<script lang="ts">
	interface Props {
		items: { label: string; url: string }[];
	}

	const { items }: Props = $props();
</script>

<div class="flex gap-2 text-xs font-bold">
	{#each items as item, index (item.url + index)}
		<a href={item.url} class="text-brand-primary no-underline">{item.label}</a><span>/</span>
	{/each}
</div>
