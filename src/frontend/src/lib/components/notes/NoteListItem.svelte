<script lang="ts">
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { NOTES_LIST_ITEM, NOTES_RETRY_DECRYPT_BUTTON } from '$lib/constants/test-ids.constants';
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
		onRetry: () => void;
	}

	let { note, onSelect, onRetry }: Props = $props();

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

	// Plain-text preview: first line as a bold title, the rest collapsed to one
	// lighter line. Both are auto-escaped by Svelte and bidi-neutralized.
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
	<button
		class="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-brand-subtle-10"
		data-tid={NOTES_LIST_ITEM}
		onclick={() => onSelect(note.id)}
		type="button"
	>
		<span class="flex min-w-0 flex-1 flex-col gap-1">
			<span style="overflow-wrap: anywhere;" class="truncate font-bold text-primary">
				{parts.title}
			</span>
			<!-- Apple-Notes style meta line: the timestamp leads and the body preview
				follows on the same line, so every row keeps the same two-line height
				whether or not the note has body text. -->
			<span class="flex min-w-0 items-baseline gap-1.5 text-xs">
				<span class="shrink-0 text-secondary">{timestamp}</span>
				{#if parts.body !== ''}
					<span class="min-w-0 flex-1 truncate text-tertiary">{parts.body}</span>
				{/if}
			</span>
		</span>
		<span class="shrink-0 text-disabled">
			<IconChevronRight />
		</span>
	</button>
{/if}
