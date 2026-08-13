<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { NOTES_DELETE_CONFIRM_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PersonalNoteUi } from '$lib/types/personal-note';
	import { personalNoteSnippet } from '$lib/utils/personal-note.utils';

	interface Props {
		note: PersonalNoteUi;
		onCancel: () => void;
		onDelete: (id: string) => void;
		disabled?: boolean;
	}

	let { note, onCancel, onDelete, disabled = false }: Props = $props();

	const snippet = $derived(personalNoteSnippet({ value: note.note }));
	// Split around the `$note` placeholder so the snippet renders as escaped, bold
	// text (never `{@html}` of the untrusted note — Decision 15).
	const parts = $derived($i18n.notes.text.delete_confirm_text.split('$note'));
</script>

<ContentWithToolbar styleClass="flex flex-col items-center pb-5">
	<span class="mb-5 text-center">
		{parts[0]}<strong>{snippet}</strong>{parts[1] ?? ''}
	</span>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel {disabled} onclick={onCancel} />
			<Button
				colorStyle="error"
				loading={disabled}
				onclick={() => onDelete(note.id)}
				testId={NOTES_DELETE_CONFIRM_BUTTON}
			>
				{$i18n.notes.text.delete_note}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
