<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconShareArrow from '$lib/components/icons/lucide/IconShareArrow.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import NoteText from '$lib/components/notes/NoteText.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		NOTES_BACK_BUTTON,
		NOTES_VIEW,
		NOTES_VIEW_DELETE_BUTTON,
		NOTES_VIEW_EDIT_BUTTON,
		NOTES_VIEW_SHARE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PersonalNoteUi } from '$lib/types/personal-note';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatPersonalNoteTimestamp } from '$lib/utils/personal-note.utils';

	interface Props {
		note: PersonalNoteUi;
		onBack: () => void;
		// Optional so the read-only view can render without the edit/delete actions
		// (they are wired once the editor and delete flows exist).
		onEdit?: () => void;
		onDelete?: (id: string) => void;
		// Opens the share flow. The Share link only renders when this is provided.
		onShare?: () => void;
	}

	let { note, onBack, onEdit, onDelete, onShare }: Props = $props();

	const metaLine = $derived.by(() => {
		const created = formatPersonalNoteTimestamp({
			ns: note.created_at_ns,
			language: $currentLanguage
		});
		if (note.updated_at_ns === note.created_at_ns) {
			return replacePlaceholders($i18n.notes.text.created, { $date: created });
		}
		return replacePlaceholders($i18n.notes.text.created_updated, {
			$created: created,
			$updated: formatPersonalNoteTimestamp({ ns: note.updated_at_ns, language: $currentLanguage })
		});
	});

	let scrollEl = $state<HTMLDivElement | undefined>();
	// True while the note overflows and there is more text below the fold — drives a
	// bottom divider that signals the content scrolls.
	let hasMoreBelow = $state(false);

	const updateScrollHint = () => {
		const el = scrollEl;
		if (isNullish(el)) {
			return;
		}
		hasMoreBelow = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
	};

	$effect(() => {
		const el = scrollEl;
		if (isNullish(el)) {
			return;
		}
		note.note; // recompute when the note content changes
		updateScrollHint();
		const observer = new ResizeObserver(updateScrollHint);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<ContentWithToolbar
	styleClass="flex min-h-0 flex-col items-stretch gap-4 overflow-y-auto"
	testId={NOTES_VIEW}
>
	<!-- Metadata + Share on one row at every breakpoint: the created/updated line on
	     the left, the quiet "Share note" link right-aligned opposite it (lower-emphasis
	     than Edit by design). The metadata may shrink/wrap on narrow screens; the link
	     stays intact on the right. -->
	<div class="flex items-center justify-between gap-2">
		<span class="flex min-w-0 items-center gap-1.5 text-xs text-tertiary">
			<IconClock size="14" />
			{metaLine}
		</span>
		{#if nonNullish(onShare)}
			<div class="shrink-0">
				<Button
					innerStyleClass="items-center"
					link
					onclick={onShare}
					testId={NOTES_VIEW_SHARE_BUTTON}
					type="button"
				>
					<IconShareArrow size="16" />
					{$i18n.notes.share.text.share_note}
				</Button>
			</div>
		{/if}
	</div>

	<!-- The note scrolls in place (no box); a bottom divider appears while there is
		more text below the fold, keeping the actions pinned beneath it. -->
	<div
		bind:this={scrollEl}
		class="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto border-brand-subtle-20"
		class:border-b={hasMoreBelow}
		onscroll={updateScrollHint}
	>
		<NoteText note={note.note} size="lg" />
	</div>

	{#if nonNullish(onEdit) || nonNullish(onDelete)}
		<!-- Edit and delete share one row to save vertical space: Edit fills the row and
			delete is a compact, icon-only button (labelled for a11y) beside it. -->
		<div class="flex items-center gap-2">
			{#if nonNullish(onEdit)}
				<!-- flex-1 wrapper so the full-width Edit button fills the row beside delete. -->
				<div class="flex-1">
					<Button
						colorStyle="secondary-light"
						fullWidth
						onclick={onEdit}
						testId={NOTES_VIEW_EDIT_BUTTON}
					>
						<IconPencil size="20" />
						{$i18n.notes.text.edit_note}
					</Button>
				</div>
			{/if}

			{#if nonNullish(onDelete)}
				<Button
					ariaLabel={$i18n.notes.text.delete_note}
					colorStyle="error"
					onclick={() => onDelete(note.id)}
					styleClass="!flex-none"
					testId={NOTES_VIEW_DELETE_BUTTON}
					transparent
				>
					<IconTrash />
				</Button>
			{/if}
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<Button colorStyle="primary" fullWidth onclick={onBack} testId={NOTES_BACK_BUTTON}>
				{$i18n.notes.text.back}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
