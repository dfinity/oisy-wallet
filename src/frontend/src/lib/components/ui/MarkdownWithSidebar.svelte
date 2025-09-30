<script lang="ts">
	import { Markdown } from '@dfinity/gix-components';
	import MarkdownSidebar from '$lib/components/ui/MarkdownSidebar.svelte';
	import type { MarkdownBlockType } from '$lib/types/markdown';
	import { type I18nSubstitutions, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getMarkdownBlocks } from '$lib/utils/markdown.utils';

	interface Props {
		title: string;
		text: string;
		stringReplacements: I18nSubstitutions;
		headingDesignator?: string; // default heading will be h3 (### in markdown)
	}

	const { title, text, stringReplacements, headingDesignator = '###' }: Props = $props();

	const blocks: MarkdownBlockType[] = $derived(
		getMarkdownBlocks({ markdown: text, headingDesignator })
	);
</script>

<h1 class="mb-4">{title}</h1>

{#each blocks as block, index (block.text + index)}
	{#if block.type === 'header'}
		<h3 id={block.id}>{block.text}</h3>
	{:else}
		<Markdown text={replacePlaceholders(block.text, stringReplacements)} />
	{/if}
{/each}

<div class="fixed right-12 top-10 hidden rounded-2xl bg-primary py-2 xl:block 1.5lg:top-28">
	<MarkdownSidebar headings={blocks.filter((block) => block.type === 'header')} />
</div>
