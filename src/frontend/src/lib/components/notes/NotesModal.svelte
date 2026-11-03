<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import DeleteNoteConfirmBottomSheet from '$lib/components/notes/DeleteNoteConfirmBottomSheet.svelte';
	import DeleteNoteConfirmContent from '$lib/components/notes/DeleteNoteConfirmContent.svelte';
	import InputPersonalNote from '$lib/components/notes/InputPersonalNote.svelte';
	import NoteView from '$lib/components/notes/NoteView.svelte';
	import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
	import ShareNoteBottomSheet from '$lib/components/notes/ShareNoteBottomSheet.svelte';
	import ShareNoteContent from '$lib/components/notes/ShareNoteContent.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import {
		NOTES_CANCEL_BUTTON,
		NOTES_EDITOR_DELETE_BUTTON,
		NOTES_MODAL,
		NOTES_SAVE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { trackPersonalNoteShare } from '$lib/services/personal-notes-analytics.services';
	import { deletePersonalNote, savePersonalNote } from '$lib/services/personal-notes.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { personalNotesList, personalNotesStore } from '$lib/stores/personal-notes.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isPersonalNoteDecryptionFailure, type PersonalNoteUi } from '$lib/types/personal-note';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatPersonalNoteTimestamp } from '$lib/utils/personal-note.utils';

	interface Props {
		// The note to open on its read-only view; omitted to open the editor for a new note.
		noteId?: string;
	}

	let { noteId }: Props = $props();

	type Step = 'view' | 'editor';

	// The page opens a fresh modal for each note, so only the initial id picks the step.
	let step = $state<Step>(untrack(() => (isNullish(noteId) ? 'editor' : 'view')));

	let editingNote = $state<PersonalNoteUi | undefined>();
	// Bumped on every editor open so the input remounts and re-applies auto-focus.
	let editorInstance = $state(0);

	let noteText = $state('');
	let isValid = $state(false);

	// The note awaiting delete confirmation (the confirmation dialog/bottom sheet is
	// shown while set); `undefined` when no confirmation is open.
	let pendingDeleteNote = $state<PersonalNoteUi | undefined>();

	// The note being shared (the share dialog/bottom sheet is shown while set);
	// `undefined` when the share flow is closed.
	let pendingShareNote = $state<PersonalNoteUi | undefined>();

	let busy = $state(false);

	// The note shown in the read-only view (reactive, so an edit reflects
	// immediately); `undefined` once it is deleted.
	const viewNote = $derived.by(() => {
		if (isNullish(noteId)) {
			return undefined;
		}
		const entry = ($personalNotesList ?? []).find(({ id }) => id === noteId);
		return nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
	});

	const stepTitle = $derived(
		step === 'view'
			? $i18n.notes.text.note
			: nonNullish(editingNote)
				? $i18n.notes.text.edit_note
				: $i18n.notes.text.add_title
	);

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

	const openEditor = (id: string) => {
		const entry = get(personalNotesStore).entries?.[id];
		editingNote = nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
		noteText = editingNote?.note ?? '';
		isValid = false;
		editorInstance += 1;
		step = 'editor';
	};

	// Save/Cancel of an edit returns to the note's view; of a new note, to the page.
	const leaveEditor = () => {
		if (isNullish(editingNote)) {
			modalStore.close();
			return;
		}
		editingNote = undefined;
		noteText = '';
		step = 'view';
	};

	// The view is dismissible; the editor step ignores backdrop/Escape
	// (and hides the header X via CSS) so unsaved text can't be lost to an accidental tap.
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
			leaveEditor();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.save }, err });
		} finally {
			busy = false;
		}
	};

	// Delete asks for confirmation first (no immediate delete / undo).
	const requestDelete = (id: string) => {
		const entry = get(personalNotesStore).entries?.[id];
		pendingDeleteNote =
			nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
	};

	const cancelDelete = () => {
		pendingDeleteNote = undefined;
	};

	// Share opens over the note view (like delete): the note stays selected, so
	// closing the share dialog returns to it.
	const openShare = (id: string) => {
		const entry = get(personalNotesStore).entries?.[id];
		pendingShareNote =
			nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
		if (nonNullish(pendingShareNote)) {
			trackPersonalNoteShare({ step: 'open', side: 'creator' });
		}
	};

	const closeShare = () => {
		pendingShareNote = undefined;
	};

	const confirmDelete = async (id: string) => {
		if (isNullish($authIdentity)) {
			return;
		}
		busy = true;
		try {
			await deletePersonalNote({ identity: $authIdentity, id });
			modalStore.close();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.delete }, err });
		} finally {
			busy = false;
		}
	};

	$effect(() => {
		// If the viewed note disappears (e.g. store refresh), there is nothing left to
		// show, so return to the page.
		if (step === 'view' && isNullish(viewNote)) {
			modalStore.close();
		}
	});
</script>

{#snippet notesBody()}
	{#if step === 'editor'}
		<ContentWithToolbar styleClass="flex min-h-0 flex-col gap-4 items-stretch overflow-y-auto">
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
						onclick={() => nonNullish(editingNote) && requestDelete(editingNote.id)}
						testId={NOTES_EDITOR_DELETE_BUTTON}
						transparent
					>
						<IconTrash />
						{$i18n.notes.text.delete_note}
					</Button>
				</div>
			{/if}

			<NotesPrivacyInfoBox />

			{#snippet toolbar()}
				<!-- Desktop keeps the footer actions. On mobile they move to the header
					(below), where the soft keyboard can't cover them; the empty footer is
					hidden via CSS. -->
				<Responsive up="md">
					<ButtonGroup>
						<ButtonCancel
							disabled={busy}
							fullWidth
							onclick={leaveEditor}
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
				</Responsive>
			{/snippet}
		</ContentWithToolbar>
	{:else if step === 'view' && nonNullish(viewNote)}
		<NoteView
			note={viewNote}
			onBack={modalStore.close}
			onDelete={requestDelete}
			onEdit={() => nonNullish(viewNote) && openEditor(viewNote.id)}
			onShare={() => nonNullish(viewNote) && openShare(viewNote.id)}
		/>
	{/if}
{/snippet}

<!-- Notes leads a capped, centered modal on desktop: it grows with content from a
	comfortable minimum up to ~80% of the viewport, then the body scrolls internally
	(below) rather than the whole modal reaching the screen edges. Mobile stays
	full-page (the global modal default). The min-height is clamped to the max so that
	on short viewports (where gix's fixed 554px min would otherwise win over the 80dvh
	max and push the modal past the screen edges) the modal still fits and its body
	scrolls. -->
<div
	class={`sm:[--dialog-max-height:80dvh] ${
		nonNullish(pendingDeleteNote)
			? 'sm:[--dialog-min-height:0]'
			: 'sm:[--dialog-min-height:min(554.25px,80dvh)]'
	}`}
	class:notes-editing={step === 'editor'}
>
	<Modal disablePointerEvents={busy} {onClose} testId={NOTES_MODAL}>
		{#snippet title()}{#if nonNullish(pendingDeleteNote)}<Responsive up="md"
					>{$i18n.notes.text.delete_note}</Responsive
				><Responsive down="sm">{stepTitle}</Responsive
				>{:else if nonNullish(pendingShareNote)}<Responsive up="md"
					>{$i18n.notes.share.text.share_note}</Responsive
				><Responsive down="sm">{stepTitle}</Responsive>{:else}{stepTitle}{/if}{/snippet}

		<!-- On mobile the editor's Cancel/Save live in the header (always above the soft
			keyboard); on desktop they stay in the footer (above). -->
		{#snippet headerLeft()}
			{#if step === 'editor'}
				<Responsive down="sm">
					<Button
						disabled={busy}
						link
						onclick={leaveEditor}
						testId={NOTES_CANCEL_BUTTON}
						type="button"
					>
						{$i18n.core.text.cancel}
					</Button>
				</Responsive>
			{/if}
		{/snippet}

		{#snippet headerRight()}
			{#if step === 'editor'}
				<Responsive down="sm">
					<Button
						disabled={saveDisabled}
						link
						loading={busy}
						onclick={handleSave}
						styleClass="font-bold"
						testId={NOTES_SAVE_BUTTON}
						type="button"
					>
						{$i18n.core.text.save}
					</Button>
				</Responsive>
			{/if}
		{/snippet}

		{#if nonNullish(pendingDeleteNote)}
			<!-- Desktop: the confirmation replaces the modal content (like Contacts).
				Mobile: the body stays and the confirmation is a bottom sheet (below). -->
			<Responsive up="md">
				<DeleteNoteConfirmContent
					disabled={busy}
					note={pendingDeleteNote}
					onCancel={cancelDelete}
					onDelete={confirmDelete}
				/>
			</Responsive>
			<Responsive down="sm">{@render notesBody()}</Responsive>
		{:else if nonNullish(pendingShareNote) && nonNullish($authIdentity)}
			<!-- Same pattern as delete: desktop replaces the content, mobile keeps the
				body and shows a bottom sheet (below). -->
			<Responsive up="md">
				<ShareNoteContent identity={$authIdentity} note={pendingShareNote} onClose={closeShare} />
			</Responsive>
			<Responsive down="sm">{@render notesBody()}</Responsive>
		{:else}
			{@render notesBody()}
		{/if}
	</Modal>
</div>

{#if nonNullish(pendingDeleteNote)}
	<Responsive down="sm">
		<DeleteNoteConfirmBottomSheet
			disabled={busy}
			note={pendingDeleteNote}
			onCancel={cancelDelete}
			onDelete={confirmDelete}
		/>
	</Responsive>
{/if}

{#if nonNullish(pendingShareNote) && nonNullish($authIdentity)}
	<Responsive down="sm">
		<ShareNoteBottomSheet identity={$authIdentity} note={pendingShareNote} onClose={closeShare} />
	</Responsive>
{/if}

<style lang="scss">
	/* The editor step has no (X): the only ways out are Cancel or Save. */
	.notes-editing :global(button[data-tid='close-modal']) {
		display: none;
	}

	/* On mobile the editor's Cancel/Save move to the header (so the soft keyboard
		can't cover them), leaving the ContentWithToolbar footer empty — hide it.
		Must match the same real-width breakpoint as the <Responsive down="sm">/
		<Responsive up="md"> pair above (640px, Tailwind's `sm`) — not gix's own
		768px full-page/boxed switch, which is unrelated. Using 768 here left a
		640-767px dead zone where the header had already switched to desktop
		(no Cancel/Save there) while this rule still hid the populated footer. */
	@media (max-width: 639.98px) {
		.notes-editing :global(div.content > :last-child) {
			display: none;
		}
	}
</style>
