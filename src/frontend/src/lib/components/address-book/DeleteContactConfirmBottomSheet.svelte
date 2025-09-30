<script lang="ts">
	import DeleteContactConfirmContent from '$lib/components/address-book/DeleteContactConfirmContent.svelte';
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	interface Props {
		onCancel: () => void;
		onDelete: () => void;
		contact: ContactUi;
		disabled?: boolean;
	}

	let { onCancel, onDelete, contact, disabled = false }: Props = $props();
</script>

<BottomSheetConfirmationPopup {disabled} {onCancel}>
	{#snippet title()}
		{replacePlaceholders($i18n.contact.delete.title, {
			$contact: contact.name
		})}
	{/snippet}

	{#snippet content()}
		<DeleteContactConfirmContent {contact} {disabled} {onCancel} {onDelete} />
	{/snippet}
</BottomSheetConfirmationPopup>
