<script lang="ts">
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
	import { NOTES_UNLOCKING } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!-- Shown while the vetKey is derived on first open (~5s). Mirrors EmptyNotes'
	layout so the wait reads as a purposeful "securing your notes" step rather than
	a generic skeleton. The pulsing shield signals ongoing work and ties visually
	to the privacy reassurance below. -->
<div class="flex flex-col items-center gap-8 text-center" data-tid={NOTES_UNLOCKING}>
	<div
		class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle-10 text-brand-primary motion-safe:animate-pulse"
	>
		<IconShieldCheck size="28" />
	</div>

	<div class="flex flex-col gap-3">
		<h1>{$i18n.notes.text.unlocking_title}</h1>
		<span class="text-tertiary">{$i18n.notes.text.unlocking_subtitle}</span>
	</div>

	<NotesPrivacyInfoBox />
</div>
