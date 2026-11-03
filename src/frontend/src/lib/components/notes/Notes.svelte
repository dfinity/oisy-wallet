<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { PersonalNotesRateLimitedError } from '$lib/canisters/errors';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import DeleteNoteConfirmBottomSheet from '$lib/components/notes/DeleteNoteConfirmBottomSheet.svelte';
	import DeleteNoteConfirmContent from '$lib/components/notes/DeleteNoteConfirmContent.svelte';
	import EmptyNotes from '$lib/components/notes/EmptyNotes.svelte';
	import NoteListItem from '$lib/components/notes/NoteListItem.svelte';
	import NotesUnavailable from '$lib/components/notes/NotesUnavailable.svelte';
	import NotesUnlocking from '$lib/components/notes/NotesUnlocking.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
	import {
		NOTES_ADD_BUTTON,
		NOTES_LIST,
		NOTES_NO_RESULTS,
		NOTES_SEARCH_INPUT
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { trackPersonalNote } from '$lib/services/personal-notes-analytics.services';
	import { deletePersonalNote, loadPersonalNotes } from '$lib/services/personal-notes.services';
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
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	const notesModalId = Symbol();

	let loading = $state(!$personalNotesLoaded);
	// Set when loadPersonalNotes enters the expensive key-derivation + decryption
	// phase (notes present); stays set until the load resolves. Drives the
	// "unlocking" screen so it isn't flashed during the quick fetch or on an empty
	// list, where no derivation happens.
	let deriving = $state(false);
	// Set when a load fails; drives the inline "unavailable" panel (with Retry)
	// instead of falling through to the empty state.
	let loadError = $state<unknown>(undefined);

	let searchTerm = $state('');

	// The note awaiting delete confirmation from its row (the confirmation
	// dialog/bottom sheet is shown while set); `undefined` when none is open.
	let pendingDeleteNote = $state<PersonalNoteUi | undefined>();
	let deleting = $state(false);

	const notes = $derived($personalNotesList);
	const showSkeleton = $derived(loading);
	const hasLoadError = $derived(!showSkeleton && nonNullish(loadError));
	const loadRateLimited = $derived(loadError instanceof PersonalNotesRateLimitedError);
	const isEmpty = $derived(!showSkeleton && !hasLoadError && (notes?.length ?? 0) === 0);

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

	const load = async () => {
		if (isNullish($authIdentity)) {
			return;
		}
		loading = true;
		deriving = false;
		loadError = undefined;
		try {
			await loadPersonalNotes({ identity: $authIdentity, onDeriveStart: () => (deriving = true) });
		} catch (err: unknown) {
			// Surface a persistent inline panel (with Retry) instead of a toast that
			// vanishes over a misleading empty state.
			loadError = err;
		} finally {
			loading = false;
			deriving = false;
		}
	};

	onMount(() => {
		// The notes surface opened — fires on every visit (the page remounts each time).
		trackPersonalNote({ step: 'open', resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS });
		// Lazy load on the first visit only; later visits in the session render from cache.
		if (!$personalNotesLoaded) {
			load();
		}
	});

	const openNote = (id: string) => {
		modalStore.openNotes({ id: notesModalId, data: { noteId: id } });
		// A note's read-only preview was opened (from the list) — distinct from `open`,
		// which is the notes surface itself.
		trackPersonalNote({ step: 'view', resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS });
	};

	const addNote = () => modalStore.openNotes({ id: notesModalId });

	// Delete asks for confirmation first (no immediate delete / undo).
	const requestDelete = (id: string) => {
		const entry = get(personalNotesStore).entries?.[id];
		pendingDeleteNote =
			nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
	};

	const cancelDelete = () => {
		pendingDeleteNote = undefined;
	};

	const confirmDelete = async (id: string) => {
		if (isNullish($authIdentity)) {
			return;
		}
		deleting = true;
		try {
			await deletePersonalNote({ identity: $authIdentity, id });
			pendingDeleteNote = undefined;
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.notes.error.delete }, err });
		} finally {
			deleting = false;
		}
	};
</script>

<div class="flex flex-col gap-6">
	{#if showSkeleton}
		{#if deriving}
			<NotesUnlocking />
		{:else}
			<SkeletonCards rows={3} />
		{/if}
	{:else if hasLoadError}
		<NotesUnavailable onRetry={load} rateLimited={loadRateLimited} />
	{:else if isEmpty}
		<EmptyNotes onAddNote={addNote} />
	{:else}
		<div class="flex w-full items-end gap-2">
			<InputSearch
				placeholder={$i18n.notes.text.search_placeholder}
				showResetButton={notEmptyString(searchTerm)}
				testId={NOTES_SEARCH_INPUT}
				bind:filter={searchTerm}
			/>
			<Button
				ariaLabel={$i18n.notes.text.add_note}
				disabled={$atPersonalNotesCapacity}
				onclick={addNote}
				styleClass="rounded-xl"
				testId={NOTES_ADD_BUTTON}
			>
				<IconPlus />
				<span class="hidden whitespace-nowrap xs:block">{$i18n.notes.text.add_note}</span>
			</Button>
		</div>

		{#if $atPersonalNotesCapacity}
			<p class="text-sm text-tertiary">
				{replacePlaceholders($i18n.notes.text.cap_reached, {
					$max: `${MAX_PERSONAL_NOTES_PER_USER}`
				})}
			</p>
		{/if}

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
						<NoteListItem {note} onDelete={requestDelete} onRetry={load} onSelect={openNote} />
					</ListItem>
				{/each}
			{/if}
		</List>
	{/if}
</div>

{#if nonNullish(pendingDeleteNote)}
	<!-- Desktop: a dialog sized to the prompt (gix's minimum height is for full modals).
		Mobile: a bottom sheet, as everywhere else in Notes. -->
	<Responsive up="md">
		<div class="sm:[--dialog-min-height:0]">
			<Modal disablePointerEvents={deleting} onClose={cancelDelete}>
				{#snippet title()}{$i18n.notes.text.delete_note}{/snippet}

				<DeleteNoteConfirmContent
					disabled={deleting}
					note={pendingDeleteNote}
					onCancel={cancelDelete}
					onDelete={confirmDelete}
				/>
			</Modal>
		</div>
	</Responsive>
	<Responsive down="sm">
		<DeleteNoteConfirmBottomSheet
			disabled={deleting}
			note={pendingDeleteNote}
			onCancel={cancelDelete}
			onDelete={confirmDelete}
		/>
	</Responsive>
{/if}
