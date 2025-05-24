<script lang="ts">
	import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
	import AddressInfoCard from '$lib/components/address-book/AddressInfoCard.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ADDRESS_EDIT_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import type { ContactAddressUi } from '$lib/types/contact';

	export let address: ContactAddressUi;
	export let onClose: (step?: AddressBookSteps) => void;
	export let previousStepName: AddressBookSteps;

	const onCloseHandler = () => {
		onClose(previousStepName ?? AddressBookSteps.SHOW_CONTACT);
	};
</script>

<ContentWithToolbar styleClass="mb-10 flex flex-col items-stretch">
	{#if address?.address}
		<AddressBookQrCode {address} />

		<AddressInfoCard {address} />
	{:else}
		<!-- Display a fallback message if no address is available. 
			Styling is minimal and could be enhanced. -->
		<div class="flex items-center justify-center py-4">
			<p class="text-center text-sm font-medium text-brand-primary"> No address available. </p>
		</div>
	{/if}

	<ButtonGroup slot="toolbar">
		<ButtonBack onclick={onCloseHandler} testId={ADDRESS_EDIT_CANCEL_BUTTON} />
	</ButtonGroup>
</ContentWithToolbar>
