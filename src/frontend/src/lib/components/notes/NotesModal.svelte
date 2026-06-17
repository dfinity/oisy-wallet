<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import EmptyNotes from '$lib/components/notes/EmptyNotes.svelte';
	import InputPersonalNote from '$lib/components/notes/InputPersonalNote.svelte';
	import NoteListItem from '$lib/components/notes/NoteListItem.svelte';
	import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
	import {
		NOTES_ADD_BUTTON,
		NOTES_CANCEL_BUTTON,
		NOTES_EDITOR_DELETE_BUTTON,
		NOTES_LIST,
		NOTES_MODAL,
		NOTES_SAVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import {
		deletePersonalNote,
		loadPersonalNotes,
		savePersonalNote
	} from '$lib/services/personal-notes.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		atPersonalNotesCapacity,
		personalNotesList,
		personalNotesLoaded,
		personalNotesStore,
		personalNotesUndoStore
	} from '$lib/stores/personal-notes.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isPersonalNoteDecryptionFailure, type PersonalNoteUi } from '$lib/types/personal-note';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatPersonalNoteTimestamp } from '$lib/utils/personal-note.utils';

	type Step = 'list' | 'editor';

	let step = $state<Step>('list');
	let editingNote = $state<PersonalNoteUi | undefined>();
	// Bumped on every editor open so the input remounts and re-applies auto-focus.
	let editorInstance = $state(0);

	let noteText = $state('');
	let isValid = $state(false);

	let loading = $state(false);
	let busy = $state(false);

	const notes = $derived($personalNotesList);
	const showSkeleton = $derived(loading || isNullish(notes));
	const isEmpty = $derived(!showSkeleton && (notes?.length ?? 0) === 0);

	// Edit Save stays disabled until the trimmed content actually changes, so a
	// no-op edit issues no write and does not bump `updated_at_ns`.
	const editorOriginal = $derived(editingNote?.note.trim() ?? '');
	const isUnchanged = $derived(noteText.trim() === editorOriginal);
	const saveDisabled = $derived(!isValid || isUnchanged || busy);

	const editorMetadata = $derived.by(() => {
		if (isNullish(editingNote)) {
			return undefined;
		}
		const created = formatPersonalNoteTimestamp({
			ns: editingNote.created_at_ns,
			language: $currentLanguage
		});
		if (editingNote.updated_at_ns === editingNote.created_at_ns) {
			return replacePlaceholders($i18n.notes.text.created, { $date: created });
		}
		return replacePlaceholders($i18n.notes.text.created_updated, {
			$created: created,
			$updated: formatPersonalNoteTimestamp({
				ns: editingNote.updated_at_ns,
				language: $currentLanguage
			})
		});
	});

	const load = async () => {
		if (isNullish($authIdentity)) {
			return;
		}
		loading = true;
		try {
			await loadPersonalNotes($authIdentity);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.load }, err });
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		// Lazy load on first open only; re-opening in the same session renders from cache.
		if (!$personalNotesLoaded) {
			load();
		}
	});

	const openEditor = (id?: string) => {
		const entry = nonNullish(id) ? get(personalNotesStore).entries?.[id] : undefined;
		editingNote = nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
		noteText = editingNote?.note ?? '';
		isValid = false;
		editorInstance += 1;
		step = 'editor';
	};

	const closeEditor = () => {
		step = 'list';
		editingNote = undefined;
		noteText = '';
	};

	// List/empty state is dismissible; the editor step ignores backdrop/Escape (and
	// hides the header X via CSS) so unsaved text can't be lost to an accidental tap.
	const onClose = () => {
		if (step === 'editor') {
			return;
		}
		modalStore.close();
	};

	const handleSave = async () => {
		if (isNullish($authIdentity)) {
			return;
		}
		busy = true;
		try {
			await savePersonalNote({
				identity: $authIdentity,
				id: editingNote?.id,
				note: noteText.trim()
			});
			closeEditor();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.save }, err });
		} finally {
			busy = false;
		}
	};

	const handleDelete = async (id: string) => {
		if (isNullish($authIdentity)) {
			return;
		}
		const entry = get(personalNotesStore).entries?.[id];
		const deleted =
			nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;

		busy = true;
		try {
			await deletePersonalNote({ identity: $authIdentity, id });
			// Keep the whole decrypted note for the Undo window (re-saved verbatim).
			if (nonNullish(deleted)) {
				personalNotesUndoStore.set(deleted);
			}
			if (step === 'editor' && editingNote?.id === id) {
				closeEditor();
			}
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.delete }, err });
		} finally {
			busy = false;
		}
	};
</script>

<div class:notes-editing={step === 'editor'}>
	<Modal disablePointerEvents={busy} {onClose} testId={NOTES_MODAL}>
		{#snippet title()}{$i18n.notes.text.title}{/snippet}

		{#if step === 'editor'}
			<ContentWithToolbar styleClass="flex flex-col gap-4 items-stretch">
				{#key editorInstance}
					<InputPersonalNote disabled={busy} bind:isValid bind:value={noteText} />
				{/key}

				{#if nonNullish(editorMetadata)}
					<span class="text-xs text-tertiary">{editorMetadata}</span>
				{/if}

				{#if nonNullish(editingNote)}
					<div>
						<Button
							colorStyle="error"
							disabled={busy}
							onclick={() => nonNullish(editingNote) && handleDelete(editingNote.id)}
							paddingSmall
							testId={NOTES_EDITOR_DELETE_BUTTON}
						>
							{$i18n.core.text.delete}
						</Button>
					</div>
				{/if}

				<NotesPrivacyInfoBox />

				{#snippet toolbar()}
					<ButtonGroup>
						<ButtonCancel
							disabled={busy}
							fullWidth
							onclick={closeEditor}
							testId={NOTES_CANCEL_BUTTON}
						/>
						<Button
							colorStyle="primary"
							disabled={saveDisabled}
							loading={busy}
							onclick={handleSave}
							testId={NOTES_SAVE_BUTTON}
							type="button"
						>
							{$i18n.core.text.save}
						</Button>
					</ButtonGroup>
				{/snippet}
			</ContentWithToolbar>
		{:else}
			<ContentWithToolbar styleClass="mx-2 flex flex-col items-stretch">
				{#if showSkeleton}
					<SkeletonCards rows={3} />
				{:else if isEmpty}
					<EmptyNotes onAddNote={() => openEditor()} />
				{:else}
					<div class="flex w-full justify-end">
						<Button
							ariaLabel={$i18n.notes.text.add_note}
							colorStyle="secondary-light"
							disabled={$atPersonalNotesCapacity}
							onclick={() => openEditor()}
							styleClass="rounded-xl"
							testId={NOTES_ADD_BUTTON}
						>
							<IconPlus />
							<span class="hidden whitespace-nowrap xs:block">{$i18n.notes.text.add_note}</span>
						</Button>
					</div>

					{#if $atPersonalNotesCapacity}
						<p class="pt-3 text-sm text-tertiary">
							{replacePlaceholders($i18n.notes.text.cap_reached, {
								$max: `${MAX_PERSONAL_NOTES_PER_USER}`
							})}
						</p>
					{/if}

					<ul class="py-4" data-tid={NOTES_LIST}>
						{#each notes ?? [] as note (note.id)}
							<NoteListItem {note} onDelete={handleDelete} onEdit={openEditor} onRetry={load} />
						{/each}
					</ul>
				{/if}

				{#snippet toolbar()}
					<ButtonCloseModal />
				{/snippet}
			</ContentWithToolbar>
		{/if}
	</Modal>
</div>

<style lang="scss">
	/* The editor step has no (X): the only ways out are Cancel or Save. */
	.notes-editing :global(button[data-tid='close-modal']) {
		display: none;
	}
</style>
