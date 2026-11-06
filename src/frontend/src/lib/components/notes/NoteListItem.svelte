<script lang="ts">
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import {
		NOTES_LIST_ITEM,
		NOTES_LIST_ITEM_DELETE_BUTTON,
		NOTES_RETRY_DECRYPT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		isPersonalNoteDecryptionFailure,
		type PersonalNoteEntryUi
	} from '$lib/types/personal-note';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		formatPersonalNoteTimestamp,
		personalNotePreviewParts
	} from '$lib/utils/personal-note.utils';

	interface Props {
		note: PersonalNoteEntryUi;
		onSelect: (id: string) => void;
		onDelete: (id: string) => void;
		onRetry: () => void;
	}

	let { note, onSelect, onDelete, onRetry }: Props = $props();

	// Never-edited notes read "Created …"; edited notes "Updated …" (and sort to the
	// top). All times render in the user's local timezone.
	const timestamp = $derived.by(() => {
		if (isPersonalNoteDecryptionFailure(note)) {
			return '';
		}
		const edited = note.updated_at_ns !== note.created_at_ns;
		return replacePlaceholders(edited ? $i18n.notes.text.updated : $i18n.notes.text.created, {
			$date: formatPersonalNoteTimestamp({
				ns: edited ? note.updated_at_ns : note.created_at_ns,
				language: $currentLanguage
			})
		});
	});

	// Plain-text preview: first line as a bold title, the rest collapsed into a
	// lighter paragraph. Both are auto-escaped by Svelte and bidi-neutralized.
	const parts = $derived(
		isPersonalNoteDecryptionFailure(note)
			? { title: '', body: '' }
			: personalNotePreviewParts(note.note)
	);
</script>

{#if isPersonalNoteDecryptionFailure(note)}
	<div class="flex w-full items-center gap-3 py-3" data-tid={NOTES_LIST_ITEM}>
		<span class="min-w-0 flex-1 text-error-primary">{$i18n.notes.text.decryption_failed}</span>
		<Button
			ariaLabel={$i18n.core.text.retry}
			colorStyle="secondary-light"
			onclick={onRetry}
			paddingSmall
			testId={NOTES_RETRY_DECRYPT_BUTTON}
		>
			{$i18n.core.text.retry}
		</Button>
	</div>
{:else}
	<!-- The delete button sits beside the row button rather than inside it: a button
		cannot contain another, and the row's pressed fill must not light up for it. -->
	<div class="flex w-full items-center gap-1">
		<button
			class="flex min-w-0 flex-1 flex-col items-stretch gap-1 rounded-xl row-feedback px-2 py-3 text-left"
			data-tid={NOTES_LIST_ITEM}
			onclick={() => onSelect(note.id)}
			type="button"
		>
			<span style="overflow-wrap: anywhere;" class="truncate font-bold text-primary">
				{parts.title}
			</span>
			<!-- Up to two lines of the body, then the timestamp on a line of its own, so
				a row grows with its preview (a title-only note stays two lines). -->
			{#if parts.body !== ''}
				<span style="overflow-wrap: anywhere;" class="line-clamp-2 text-sm text-tertiary">
					{parts.body}
				</span>
			{/if}
			<span class="text-xs text-secondary">{timestamp}</span>
		</button>

		<ButtonIcon
			ariaLabel={$i18n.notes.text.delete_note}
			colorStyle="error"
			link={false}
			onclick={() => onDelete(note.id)}
			testId={NOTES_LIST_ITEM_DELETE_BUTTON}
			transparent
		>
			{#snippet icon()}
				<IconTrash />
			{/snippet}
		</ButtonIcon>
	</div>
{/if}
