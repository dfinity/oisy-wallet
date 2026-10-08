<script lang="ts">
	import type { Identity } from '@icp-sdk/core/agent';
	import ShareNoteContent from '$lib/components/notes/ShareNoteContent.svelte';
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PersonalNoteUi } from '$lib/types/personal-note';

	interface Props {
		note: PersonalNoteUi;
		identity: Identity;
		onClose: () => void;
	}

	let { note, identity, onClose }: Props = $props();
</script>

<BottomSheetConfirmationPopup onCancel={onClose}>
	{#snippet title()}
		{$i18n.notes.share.text.share_note}
	{/snippet}

	{#snippet content()}
		<div class="px-4">
			<ShareNoteContent {identity} {note} {onClose} />
		</div>
	{/snippet}
</BottomSheetConfirmationPopup>
