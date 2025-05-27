<script lang="ts">
	import { BottomSheet, Backdrop } from '@dfinity/gix-components';
	import DeleteAddressConfirmContent from '$lib/components/address-book/DeleteAddressConfirmContent.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';

	interface Props {
		onCancel: () => void;
		onDelete: () => void;
		address: ContactAddressUi;
		contact: ContactUi;
	}

	let { onCancel, onDelete, address, contact }: Props = $props();
</script>

<div class="fixed inset-0 z-50">
	<BottomSheet transition>
		<div class="flex w-full flex-col">
			<div class="w-full p-4">
				<ButtonIcon
					onclick={onCancel}
					styleClass="text-disabled float-right"
					ariaLabel={$i18n.core.alt.close_details}
				>
					{#snippet icon()}
						<IconClose size="24" />
					{/snippet}
				</ButtonIcon>
			</div>

			<h3 class="mb-2 mt-4 text-center">{$i18n.address.delete.title}</h3>

			<DeleteAddressConfirmContent {onCancel} {onDelete} {address} {contact} />
		</div>
	</BottomSheet>

	<Backdrop on:nnsClose={onCancel} />
</div>
