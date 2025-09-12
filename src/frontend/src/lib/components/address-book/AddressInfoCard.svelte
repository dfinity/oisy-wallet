<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import AddressItemActions from '$lib/components/contact/AddressItemActions.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';

	interface Props {
		address: ContactAddressUi;
	}

	const { address }: Props = $props();
</script>

<Value element="div" ref="address-info">
	{#snippet label()}
		<div class="mb-3 font-bold text-primary">
			{$i18n.address.types[address.addressType]}
		</div>
	{/snippet}

	{#snippet content()}
		<div class="flex items-center justify-between gap-4 rounded-lg bg-brand-subtle-10 px-3 py-3">
			<div class="h-8 w-8">
				<IconAddressType addressType={address.addressType} size="32" />
			</div>

			<div class="flex-1 overflow-hidden px-2">
				{#if notEmptyString(address.label)}
					<div class="truncate text-sm font-bold text-primary">
						{address.label}
					</div>
				{/if}
				<div class="break-all text-sm text-primary">
					{address.address}
				</div>
			</div>

			<AddressItemActions {address} />
		</div>
	{/snippet}
</Value>
