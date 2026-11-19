<script lang="ts">
	import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { NOTES_UNLOCKING } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!-- Shown while the vetKey is derived on first open (~5s). Mirrors EmptyNotes'
	layout so the wait reads as a purposeful "securing your notes" step rather than
	a generic skeleton. The shared visor indicates ongoing work; the privacy notice
	below keeps the encryption reassurance. -->
<div class="flex flex-col items-center gap-8 text-center" data-tid={NOTES_UNLOCKING}>
	<div class="flex h-16 w-16 items-center justify-center text-brand-primary dark:text-primary">
		<Spinner inline size="48px" />
	</div>

	<div class="flex flex-col gap-3">
		<h1>{$i18n.notes.text.unlocking_title}</h1>
		<span class="text-tertiary">{$i18n.notes.text.unlocking_subtitle}</span>
	</div>

	<NotesPrivacyInfoBox />
</div>
