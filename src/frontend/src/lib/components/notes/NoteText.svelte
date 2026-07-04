<script lang="ts">
	import { linkifyPersonalNote, neutralizePersonalNoteText } from '$lib/utils/personal-note.utils';

	interface Props {
		note: string;
	}

	let { note }: Props = $props();

	// First non-empty line is the bold title (matching the list); the rest is the body
	// with line breaks preserved. URLs in both become safe links (Decision 16): the
	// text is bidi-neutralized and rendered with Svelte auto-escaping, never {@html}.
	const neutralized = $derived(neutralizePersonalNoteText(note));
	const lines = $derived(neutralized.split('\n'));
	const firstNonEmptyIndex = $derived(lines.findIndex((line) => line.trim() !== ''));
	const titleText = $derived(firstNonEmptyIndex === -1 ? '' : lines[firstNonEmptyIndex].trim());
	const bodyText = $derived(
		firstNonEmptyIndex === -1 ? '' : lines.slice(firstNonEmptyIndex + 1).join('\n')
	);
	const titleSegments = $derived(linkifyPersonalNote(titleText));
	const bodySegments = $derived(bodyText === '' ? [] : linkifyPersonalNote(bodyText));
</script>

<p style="overflow-wrap: anywhere;" class="font-bold text-primary">
	{#each titleSegments as segment, index (index)}{#if segment.href}<a
				class="text-brand-primary underline"
				href={segment.href}
				rel="noopener noreferrer"
				target="_blank">{segment.text}</a
			>{:else}{segment.text}{/if}{/each}
</p>
{#if bodySegments.length > 0}
	<p style="overflow-wrap: anywhere;" class="whitespace-pre-wrap text-primary">
		{#each bodySegments as segment, index (index)}{#if segment.href}<a
					class="text-brand-primary underline"
					href={segment.href}
					rel="noopener noreferrer"
					target="_blank">{segment.text}</a
				>{:else}{segment.text}{/if}{/each}
	</p>
{/if}
