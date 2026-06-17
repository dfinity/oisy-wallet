<script lang="ts">
	import IconNotebook from '$lib/components/icons/lucide/IconNotebook.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		NOTES_DELETE_BUTTON,
		NOTES_EDIT_BUTTON,
		NOTES_LIST_ITEM,
		NOTES_RETRY_DECRYPT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		isPersonalNoteDecryptionFailure,
		type PersonalNoteEntryUi
	} from '$lib/types/personal-note';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatPersonalNoteTimestamp, personalNotePreview } from '$lib/utils/personal-note.utils';

	interface Props {
		note: PersonalNoteEntryUi;
		onEdit: (id: string) => void;
		onDelete: (id: string) => void;
		onRetry: () => void;
	}

	let { note, onEdit, onDelete, onRetry }: Props = $props();

	const failed = $derived(isPersonalNoteDecryptionFailure(note));

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

	// Plain-text preview: bidi-neutralized, whitespace collapsed to a single line,
	// then clamped to 2 lines via CSS (escaping still applies — Svelte auto-escapes).
	const preview = $derived(
		isPersonalNoteDecryptionFailure(note) ? '' : personalNotePreview(note.note)
	);
</script>

<li
	class="group flex items-center gap-3 border-b border-brand-subtle-10 py-3 last-of-type:border-b-0"
	data-tid={NOTES_LIST_ITEM}
>
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle-10 text-tertiary"
	>
		<IconNotebook size="20" />
	</div>

	{#if failed}
		<div class="flex min-w-0 flex-1 flex-col">
			<span class="text-error-primary">{$i18n.notes.text.decryption_failed}</span>
		</div>
		<Button
			ariaLabel={$i18n.core.text.retry}
			colorStyle="secondary-light"
			onclick={onRetry}
			paddingSmall
			testId={NOTES_RETRY_DECRYPT_BUTTON}
		>
			{$i18n.core.text.retry}
		</Button>
	{:else}
		<button
			class="flex min-w-0 flex-1 flex-col gap-1 text-left"
			onclick={() => onEdit(note.id)}
			type="button"
		>
			<span
				style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere;"
				class="text-primary"
			>
				{preview}
			</span>
			<span class="text-xs text-tertiary">{timestamp}</span>
		</button>

		<div
			class="flex shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
		>
			<button
				class="p-2 text-tertiary hover:text-primary"
				aria-label={$i18n.notes.alt.edit}
				data-tid={NOTES_EDIT_BUTTON}
				onclick={() => onEdit(note.id)}
				type="button"
			>
				<IconPencil size="20" />
			</button>
			<button
				class="p-2 text-tertiary hover:text-error-primary"
				aria-label={$i18n.notes.alt.delete}
				data-tid={NOTES_DELETE_BUTTON}
				onclick={() => onDelete(note.id)}
				type="button"
			>
				<IconTrash />
			</button>
		</div>
	{/if}
</li>
