<script lang="ts">
	import { PERSONAL_NOTES_ENABLED } from '$env/personal-notes.env';
	import Notes from '$lib/components/notes/Notes.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!-- Gated like the navigation entry and the note modal (Modals.svelte): with the flag
	off, a page reached by URL would list notes that cannot be opened. -->
{#if PERSONAL_NOTES_ENABLED}
	<PageTitle>{$i18n.notes.text.title}</PageTitle>

	<Notes />
{/if}
