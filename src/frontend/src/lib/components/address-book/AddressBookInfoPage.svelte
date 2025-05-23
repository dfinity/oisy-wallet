<script lang="ts">
	import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
    import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
    import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ADDRESS_EDIT_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import type { ContactAddressUi } from '$lib/types/contact';
	const { address, close }: { address: ContactAddressUi; close: () => void } = $props();
	const goBack = () => {
		close();
	};
</script>

<ContentWithToolbar styleClass="mb-10 flex flex-col items-stretch">
	{#if address?.address}
		<AddressBookQrCode {address} />

		<AddressListItem
			{address}
			showFullAddress={true}
			styleClass="shadow-sm border border-divider"
			showTypeOnTop={true}
		/>

	{:else}
	<div class="flex justify-center items-center py-4">
		<p class="text-center text-sm text-brand-primary font-medium">
			No address available.
		</p>
	</div>
	{/if}
	<ButtonGroup slot="toolbar">
        <ButtonBack onclick={goBack} testId={ADDRESS_EDIT_CANCEL_BUTTON} />
    </ButtonGroup>
    </ContentWithToolbar>