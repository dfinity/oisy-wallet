<script lang="ts">
	import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import RoundedIcon from '$lib/components/ui/RoundedIcon.svelte';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { ADDRESS_EDIT_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import type { ContactAddressUi } from '$lib/types/contact';

	const { address, close }: { address: ContactAddressUi; close: () => void } = $props();

	const goBack = () => {
		close();
	};
</script>
<div class="flex flex-col gap-4">
{#if address?.address}

		<AddressBookQrCode {address} />

		<LogoButton styleClass="group">
			<!-- Logo slot -->
			<div class="mr-2" slot="logo">
				<RoundedIcon icon={IconWallet} />
			</div>

			<!-- Title: the address (ellipsized) -->
			<svelte:fragment slot="title">
				<span class="text-base">{shortenWithMiddleEllipsis({ text: address.address })}</span>
			</svelte:fragment>

			<!-- Description: label or type -->
			<svelte:fragment slot="description">
				<span class="text-sm text-tertiary">
					{#if address.label}
						{address.label}
					{:else}
						{address.addressType}
					{/if}
				</span>
			</svelte:fragment>
		</LogoButton>


{:else}
	<p class="text-red-600">No address available</p>
	
{/if}
<div class="flex w-full justify-center pt-10">
	<ButtonBack onclick={goBack} testId={ADDRESS_EDIT_CANCEL_BUTTON} />
</div>
</div>
