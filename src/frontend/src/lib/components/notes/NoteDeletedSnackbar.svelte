<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fly } from 'svelte/transition';
	import { NOTES_DELETED_SNACKBAR, NOTES_UNDO_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { restorePersonalNote } from '$lib/services/personal-notes.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { personalNotesUndoStore } from '$lib/stores/personal-notes.store';
	import { toastsError } from '$lib/stores/toasts.store';

	// The undo window: the snackbar auto-dismisses after a few seconds, matching the
	// app's toast behaviour. Restarts whenever a newer delete replaces the note.
	const UNDO_TIMEOUT_MS = 5000;

	$effect(() => {
		if (isNullish($personalNotesUndoStore)) {
			return;
		}
		const timer = setTimeout(() => personalNotesUndoStore.set(undefined), UNDO_TIMEOUT_MS);
		return () => clearTimeout(timer);
	});

	const undo = async () => {
		const note = $personalNotesUndoStore;
		personalNotesUndoStore.set(undefined);

		if (isNullish(note) || isNullish($authIdentity)) {
			return;
		}

		try {
			await restorePersonalNote({ identity: $authIdentity, note });
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.restore }, err });
		}
	};
</script>

{#if nonNullish($personalNotesUndoStore)}
	<div class="pointer-events-none fixed inset-x-0 bottom-4 z-[1100] flex justify-center px-4">
		<div
			class="pointer-events-auto flex items-center gap-4 rounded-lg bg-primary-inverted px-4 py-3 text-sm text-primary-inverted shadow-lg"
			data-tid={NOTES_DELETED_SNACKBAR}
			transition:fly={{ y: 20, duration: 150 }}
		>
			<span>{$i18n.notes.text.deleted}</span>
			<button
				class="font-bold text-brand-primary-alt hover:underline"
				data-tid={NOTES_UNDO_BUTTON}
				onclick={undo}
				type="button"
			>
				{$i18n.notes.text.undo}
			</button>
		</div>
	</div>
{/if}
