<script lang="ts">
	import { Markdown } from '@dfinity/gix-components';
	import { type I18nSubstitutions, replacePlaceholders } from '$lib/utils/i18n.utils';
	import MarkdownSidebar from '$lib/components/ui/MarkdownSidebar.svelte';

	interface Props {
		title: string;
		text: string;
		stringReplacements: I18nSubstitutions;
	}

	const { title, text, stringReplacements }: Props = $props();

	const blocks = $derived.by(() =>
		text.split('\n').map((line: string) => {
			if (line.startsWith('###')) {
				const title = line.replace(/^###\s*/, '').trim();
				const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
				return { type: 'header', text: title, id };
			}
			return { type: 'default', text: line };
		})
	);
</script>

<h1 class="mb-4">{title}</h1>

{#each blocks as block}
	{#if block.type === 'header'}
		<h3 id={block.id}>{block.text.replace(/\\+/g, '')}</h3>
	{:else}
		<Markdown text={replacePlaceholders(block.text, stringReplacements)} />
	{/if}
{/each}

<MarkdownSidebar {text} />
