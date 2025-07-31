<script lang="ts">
	import { QRCode } from '@dfinity/gix-components';
	import { debounce, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';

	const { address }: { address: ContactAddressUi } = $props();

	let render = $state(true);

	const rerender = debounce(() => {
		render = false;
		setTimeout(() => (render = true), 0);
	});
</script>

<svelte:window on:resize={rerender} />

<div
	class="mx-auto mb-8 aspect-square h-80 max-h-[44vh] max-w-[100%] rounded-xl bg-white p-4"
	class:opacity-0={!render}
	in:fade
>
	{#if render && nonNullish(address?.address)}
		<QRCode value={address.address}>
			<svelte:fragment slot="logo">
				{#if nonNullish(address.addressType)}
					<div class="flex items-center justify-center rounded-lg bg-primary p-2">
						<IconAddressType addressType={address.addressType} size="48" />
					</div>
				{/if}
			</svelte:fragment>
		</QRCode>
	{/if}
</div>
