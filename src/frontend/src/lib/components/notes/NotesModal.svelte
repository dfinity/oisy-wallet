<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import DeleteNoteConfirmBottomSheet from '$lib/components/notes/DeleteNoteConfirmBottomSheet.svelte';
	import DeleteNoteConfirmContent from '$lib/components/notes/DeleteNoteConfirmContent.svelte';
	import EmptyNotes from '$lib/components/notes/EmptyNotes.svelte';
	import InputPersonalNote from '$lib/components/notes/InputPersonalNote.svelte';
	import NoteListItem from '$lib/components/notes/NoteListItem.svelte';
	import NoteView from '$lib/components/notes/NoteView.svelte';
	import NotesPrivacyInfoBox from '$lib/components/notes/NotesPrivacyInfoBox.svelte';
	import ShareNoteBottomSheet from '$lib/components/notes/ShareNoteBottomSheet.svelte';
	import ShareNoteContent from '$lib/components/notes/ShareNoteContent.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { TRACK_NOTE_SHARE_OPEN } from '$lib/constants/analytics.constants';
	import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
	import {
		NOTES_ADD_BUTTON,
		NOTES_CANCEL_BUTTON,
		NOTES_EDITOR_DELETE_BUTTON,
		NOTES_LIST,
		NOTES_MODAL,
		NOTES_NO_RESULTS,
		NOTES_SAVE_BUTTON,
		NOTES_SEARCH_INPUT
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { trackEvent } from '$lib/services/analytics.services';
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
		personalNotesStore
	} from '$lib/stores/personal-notes.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isPersonalNoteDecryptionFailure, type PersonalNoteUi } from '$lib/types/personal-note';
	import { isDesktop } from '$lib/utils/device.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatPersonalNoteTimestamp } from '$lib/utils/personal-note.utils';

	type Step = 'list' | 'view' | 'editor';

	let step = $state<Step>('list');
	let viewNoteId = $state<string | undefined>();
	// Whether the editor was opened from a note's View — drives where Save/Cancel
	// returns (back to that View vs. the list).
	let editorFromView = $state(false);

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

	let loading = $state(false);
	let busy = $state(false);

	let searchTerm = $state('');

	const notes = $derived($personalNotesList);
	const showSkeleton = $derived(loading || isNullish(notes));
	const isEmpty = $derived(!showSkeleton && (notes?.length ?? 0) === 0);

	// Client-side search: case-insensitive substring over the full (decrypted) note
	// text — no backend call (the canister only holds ciphertext). Failed-to-decrypt
	// entries have no text, so a non-empty query hides them.
	const filteredNotes = $derived.by(() => {
		const all = notes ?? [];
		const term = searchTerm.trim().toLowerCase();
		if (term === '') {
			return all;
		}
		return all.filter(
			(note) => !isPersonalNoteDecryptionFailure(note) && note.note.toLowerCase().includes(term)
		);
	});

	// The note currently shown in the read-only view (reactive, so an edit reflects
	// immediately); `undefined` if it was deleted while open.
	const viewNote = $derived.by(() => {
		if (isNullish(viewNoteId)) {
			return undefined;
		}
		const entry = (notes ?? []).find(({ id }) => id === viewNoteId);
		return nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
	});

	const stepTitle = $derived(
		step === 'view'
			? $i18n.notes.text.note
			: step === 'editor'
				? nonNullish(editingNote)
					? $i18n.notes.text.edit_note
					: $i18n.notes.text.add_title
				: $i18n.notes.text.title
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

	const openView = (id: string) => {
		viewNoteId = id;
		step = 'view';
	};

	const openEditor = ({ id, fromView = false }: { id?: string; fromView?: boolean } = {}) => {
		const entry = nonNullish(id) ? get(personalNotesStore).entries?.[id] : undefined;
		editingNote = nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
		editorFromView = fromView;
		noteText = editingNote?.note ?? '';
		isValid = false;
		editorInstance += 1;
		step = 'editor';
	};

	// Save/Cancel of an edit opened from a note's View returns to that View; a new
	// note (opened from the list) returns to the list.
	const leaveEditor = () => {
		editingNote = undefined;
		noteText = '';
		if (editorFromView && nonNullish(viewNoteId)) {
			step = 'view';
		} else {
			step = 'list';
		}
	};

	const backToList = () => {
		viewNoteId = undefined;
		step = 'list';
	};

	// List/empty/view states are dismissible; the editor step ignores backdrop/Escape
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
			trackEvent({ name: TRACK_NOTE_SHARE_OPEN });
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
			pendingDeleteNote = undefined;
			editingNote = undefined;
			noteText = '';
			backToList();
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.delete }, err });
		} finally {
			busy = false;
		}
	};

	$effect(() => {
		// If the selected note disappears while viewing (e.g. store refresh), keep
		// title/body in sync by returning to the list.
		if (step === 'view' && isNullish(viewNote)) {
			backToList();
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
			onBack={backToList}
			onDelete={requestDelete}
			onEdit={() => nonNullish(viewNote) && openEditor({ id: viewNote.id, fromView: true })}
			onShare={() => nonNullish(viewNote) && openShare(viewNote.id)}
		/>
	{:else}
		<!-- gap-6 gives a comfortable space between the pinned search and the list;
			pb-0! drops the shared modal's large bottom padding so the list sits a
			little above the footer divider (the ~16px content gap remains).
			overflow-y-auto lets the empty/skeleton states scroll within the body on
			short viewports (the list state scrolls inside its own region below, so
			this stays a no-op there). -->
		<ContentWithToolbar
			styleClass="mx-2 flex min-h-0 flex-col items-stretch gap-6 overflow-y-auto pb-0!"
		>
			{#if showSkeleton}
				<SkeletonCards rows={3} />
			{:else if isEmpty}
				<EmptyNotes onAddNote={() => openEditor()} />
			{:else}
				<div class="flex w-full shrink-0 items-end gap-2">
					<InputSearch
						autofocus={isDesktop()}
						placeholder={$i18n.notes.text.search_placeholder}
						showResetButton={notEmptyString(searchTerm)}
						testId={NOTES_SEARCH_INPUT}
						bind:filter={searchTerm}
					/>
					<Button
						ariaLabel={$i18n.notes.text.add_note}
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
					<p class="shrink-0 pt-3 text-sm text-tertiary">
						{replacePlaceholders($i18n.notes.text.cap_reached, {
							$max: `${MAX_PERSONAL_NOTES_PER_USER}`
						})}
					</p>
				{/if}

				<!-- Only the list scrolls, so the scrollbar stays out of the search header
					and the pinned footer. -->
				<div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
					<List noPadding testId={NOTES_LIST}>
						{#if filteredNotes.length === 0}
							<ListItem>
								<span class="text-secondary" data-tid={NOTES_NO_RESULTS}>
									{$i18n.notes.text.no_results}
								</span>
							</ListItem>
						{:else}
							{#each filteredNotes as note (note.id)}
								<ListItem>
									<NoteListItem {note} onRetry={load} onSelect={openView} />
								</ListItem>
							{/each}
						{/if}
					</List>
				</div>
			{/if}

			{#snippet toolbar()}
				<ButtonCloseModal />
			{/snippet}
		</ContentWithToolbar>
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
		Matches the md (768px) breakpoint where the header actions switch off. */
	@media (max-width: 767.98px) {
		.notes-editing :global(div.content > :last-child) {
			display: none;
		}
	}
</style>
