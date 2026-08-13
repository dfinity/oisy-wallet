<script lang="ts">
	import { linkifyPersonalNote, neutralizePersonalNoteText } from '$lib/utils/personal-note.utils';

	interface Props {
		note: string;
		// 'lg' gives the full-screen note view a larger title and body; 'base'
		// (default) keeps the compact size used elsewhere (e.g. the shared-note page).
		size?: 'base' | 'lg';
	}

	let { note, size = 'base' }: Props = $props();

	// First non-empty line is the bold title (matching the list); the rest is the body
	// with line breaks preserved. URLs in both become safe links (Decision 16): the
	// text is bidi-neutralized and rendered with Svelte auto-escaping, never {@html}.
	const neutralized = $derived(neutralizePersonalNoteText(note));
	const lines = $derived(neutralized.split('\n'));
	const firstNonEmptyIndex = $derived(lines.findIndex((line) => line.trim() !== ''));
	const titleText = $derived(firstNonEmptyIndex === -1 ? '' : lines[firstNonEmptyIndex].trim());
	// Body starts at the next non-empty line, so blank lines typed between the title
	// and the body don't open a gap; blank lines within the body are still preserved.
	const bodyLines = $derived(firstNonEmptyIndex === -1 ? [] : lines.slice(firstNonEmptyIndex + 1));
	const bodyStartIndex = $derived(bodyLines.findIndex((line) => line.trim() !== ''));
	const bodyText = $derived(
		bodyStartIndex === -1 ? '' : bodyLines.slice(bodyStartIndex).join('\n')
	);
	const titleSegments = $derived(linkifyPersonalNote(titleText));
	const bodySegments = $derived(bodyText === '' ? [] : linkifyPersonalNote(bodyText));
</script>

<p style="overflow-wrap: anywhere;" class="font-bold text-primary" class:text-xl={size === 'lg'}>
	{#each titleSegments as segment, index (index)}{#if segment.href}<a
				class="text-brand-primary underline"
				href={segment.href}
				rel="noopener noreferrer"
				target="_blank">{segment.text}</a
			>{:else}{segment.text}{/if}{/each}
</p>
{#if bodySegments.length > 0}
	<p
		style="overflow-wrap: anywhere;"
		class="whitespace-pre-wrap text-primary"
		class:text-lg={size === 'lg'}
	>
		{#each bodySegments as segment, index (index)}{#if segment.href}<a
					class="text-brand-primary underline"
					href={segment.href}
					rel="noopener noreferrer"
					target="_blank">{segment.text}</a
				>{:else}{segment.text}{/if}{/each}
	</p>
{/if}
