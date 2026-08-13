<script lang="ts">
	import DeleteNoteConfirmContent from '$lib/components/notes/DeleteNoteConfirmContent.svelte';
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PersonalNoteUi } from '$lib/types/personal-note';

	interface Props {
		note: PersonalNoteUi;
		onCancel: () => void;
		onDelete: (id: string) => void;
		disabled?: boolean;
	}

	let { note, onCancel, onDelete, disabled = false }: Props = $props();
</script>

<BottomSheetConfirmationPopup {disabled} {onCancel}>
	{#snippet title()}
		{$i18n.notes.text.delete_note}
	{/snippet}

	{#snippet content()}
		<!-- The bottom sheet doesn't pad its content, so add the left/right padding here. -->
		<div class="px-4">
			<DeleteNoteConfirmContent {disabled} {note} {onCancel} {onDelete} />
		</div>
	{/snippet}
</BottomSheetConfirmationPopup>
