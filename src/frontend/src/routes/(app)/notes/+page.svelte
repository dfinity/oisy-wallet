<script lang="ts">
	import { PERSONAL_NOTES_ENABLED } from '$env/personal-notes.env';
	import Notes from '$lib/components/notes/Notes.svelte';
</script>

{#if PERSONAL_NOTES_ENABLED}
	<Notes presentation="page" />
{/if}
