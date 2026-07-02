<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
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
		// Wired once the share flow exists; until then the link renders but is inert.
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
</script>

<ContentWithToolbar
	styleClass="flex min-h-0 flex-col items-stretch gap-4 overflow-y-auto"
	testId={NOTES_VIEW}
>
	<!-- Long notes scroll inside the box; the metadata and actions stay pinned below. -->
	<div
		class="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-brand-subtle-20 p-4"
	>
		<NoteText note={note.note} />
	</div>

	<!-- Desktop: "Share note" is a quiet blue text link right-aligned opposite the
	     created/updated line. Mobile: it drops to its own left-aligned line beneath.
	     Lower-emphasis than Edit by design. Inert until the share flow is wired. -->
	<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
		<span class="text-xs text-tertiary">{metaLine}</span>
		<div>
			<Button link onclick={onShare} testId={NOTES_VIEW_SHARE_BUTTON}>
				<IconShareArrow size="16" />
				{$i18n.notes.share.text.share_note}
			</Button>
		</div>
	</div>

	{#if nonNullish(onEdit)}
		<!-- Wrap so the button's own flex-1 can't stretch it vertically in this column. -->
		<div>
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
		<div class="flex justify-center">
			<Button
				colorStyle="error"
				onclick={() => onDelete(note.id)}
				testId={NOTES_VIEW_DELETE_BUTTON}
				transparent
			>
				<IconTrash />
				{$i18n.notes.text.delete_note}
			</Button>
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
