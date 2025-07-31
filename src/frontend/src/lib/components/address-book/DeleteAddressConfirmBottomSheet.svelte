<script lang="ts">
	import DeleteAddressConfirmContent from '$lib/components/address-book/DeleteAddressConfirmContent.svelte';
	import BottomSheetConfirmationPopup from '$lib/components/ui/BottomSheetConfirmationPopup.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';

	interface Props {
		onCancel: () => void;
		onDelete: () => void;
		address: ContactAddressUi;
		contact: ContactUi;
		disabled?: boolean;
	}

	let { onCancel, onDelete, address, contact, disabled = false }: Props = $props();
</script>

<BottomSheetConfirmationPopup {disabled} {onCancel}>
	{#snippet title()}
		{$i18n.address.delete.title}
	{/snippet}

	{#snippet content()}
		<DeleteAddressConfirmContent {address} {contact} {disabled} {onCancel} {onDelete} />
	{/snippet}
</BottomSheetConfirmationPopup>
