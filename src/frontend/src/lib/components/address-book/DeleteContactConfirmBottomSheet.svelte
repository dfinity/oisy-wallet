<script lang="ts">
	import { Backdrop, BottomSheet } from '@dfinity/gix-components';
	import DeleteContactConfirmContent from '$lib/components/address-book/DeleteContactConfirmContent.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
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

<div class="fixed inset-0 z-50">
	<BottomSheet transition>
		<div class="flex w-full flex-col px-1">
			<div class="w-full p-4">
				<ButtonIcon
					onclick={onCancel}
					styleClass="text-disabled float-right"
					ariaLabel={$i18n.core.alt.close_details}
					{disabled}
				>
					{#snippet icon()}
						<IconClose size="24" />
					{/snippet}
				</ButtonIcon>
			</div>

			<h3 class="mb-2 mt-4 text-center"
				>{replacePlaceholders($i18n.contact.delete.title, {
					$contact: contact.name
				})}</h3
			>

			<DeleteContactConfirmContent {onCancel} {onDelete} {contact} {disabled} />
		</div>
	</BottomSheet>

	<Backdrop on:nnsClose={onCancel} />
</div>
