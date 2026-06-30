<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import EmptyNotes from '$lib/components/notes/EmptyNotes.svelte';
	import NoteListItem from '$lib/components/notes/NoteListItem.svelte';
	import NoteView from '$lib/components/notes/NoteView.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import {
		NOTES_LIST,
		NOTES_MODAL,
		NOTES_NO_RESULTS,
		NOTES_SEARCH_INPUT
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadPersonalNotes } from '$lib/services/personal-notes.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { personalNotesList, personalNotesLoaded } from '$lib/stores/personal-notes.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isPersonalNoteDecryptionFailure } from '$lib/types/personal-note';
	import { isDesktop } from '$lib/utils/device.utils';

	type Step = 'list' | 'view';

	let step = $state<Step>('list');
	let viewNoteId = $state<string | undefined>();

	let loading = $state(false);
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

	// The note currently shown in the read-only view (reactive, so it stays in sync);
	// `undefined` if it disappeared while open.
	const viewNote = $derived.by(() => {
		if (isNullish(viewNoteId)) {
			return undefined;
		}
		const entry = (notes ?? []).find(({ id }) => id === viewNoteId);
		return nonNullish(entry) && !isPersonalNoteDecryptionFailure(entry) ? entry : undefined;
	});

	const stepTitle = $derived(step === 'view' ? $i18n.notes.text.note : $i18n.notes.text.title);

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

	const backToList = () => {
		viewNoteId = undefined;
		step = 'list';
	};
</script>

{#snippet notesBody()}
	{#if step === 'view' && nonNullish(viewNote)}
		<NoteView note={viewNote} onBack={backToList} />
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
				<EmptyNotes />
			{:else}
				<div class="w-full shrink-0">
					<InputSearch
						autofocus={isDesktop()}
						placeholder={$i18n.notes.text.search_placeholder}
						showResetButton={notEmptyString(searchTerm)}
						testId={NOTES_SEARCH_INPUT}
						bind:filter={searchTerm}
					/>
				</div>

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
<div class="sm:[--dialog-max-height:80dvh] sm:[--dialog-min-height:min(554.25px,80dvh)]">
	<Modal onClose={modalStore.close} testId={NOTES_MODAL}>
		{#snippet title()}{stepTitle}{/snippet}

		{@render notesBody()}
	</Modal>
</div>
