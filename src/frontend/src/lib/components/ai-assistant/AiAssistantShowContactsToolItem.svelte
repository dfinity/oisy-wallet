<script lang="ts">
	import { slide } from 'svelte/transition';
	import Divider from '$lib/components/common/Divider.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUiWithId, ExtendedAddressContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		contact: ExtendedAddressContactUi;
		onClick: (address: ContactAddressUiWithId) => void;
	}

	let { contact, onClick }: Props = $props();

	let expanded = $state(false);
	const toggleContent = () => {
		expanded = !expanded;
	};

	let singleAddress = $derived(contact.addresses.length === 1);
</script>

{#snippet header()}
	<LogoButton
		condensed
		hover={false}
		onClick={singleAddress ? () => onClick(contact.addresses[0]) : toggleContent}
	>
		{#snippet logo()}
			<span class="pr-2">
				<AvatarWithBadge badge={{ type: 'addressTypeOrCount' }} {contact} variant="sm" />
			</span>
		{/snippet}

		{#snippet title()}
			{contact.name}
		{/snippet}

		{#snippet description()}
			<span class="block w-full truncate">
				{#each contact.addresses as address, index (index)}
					{#if index !== 0}
						<Divider />
					{/if}

					<span class:font-bold={singleAddress} class:text-primary={singleAddress}>
						{$i18n.address.types[address.addressType]}
					</span>
				{/each}

				{#if singleAddress}
					&nbsp;{shortenWithMiddleEllipsis({ text: contact.addresses[0].address })}
				{/if}
			</span>
		{/snippet}

		{#snippet action()}
			{#if !singleAddress}
				<ButtonIcon
					ariaLabel={expanded
						? $i18n.address_book.alt.hide_addresses
						: $i18n.address_book.alt.show_addresses_of_contact}
					colorStyle="tertiary-alt"
					height="h-8"
					link={false}
					onclick={(event: MouseEvent) => {
						event.preventDefault();
					}}
					styleClass="text-primary"
					transparent
					width="w-8"
				>
					{#snippet icon()}
						<IconExpand {expanded} />
					{/snippet}
				</ButtonIcon>
			{/if}
		{/snippet}
	</LogoButton>
{/snippet}

<div
	class="flex w-full flex-col rounded-xl bg-brand-subtle-10 p-2 hover:bg-brand-subtle-20"
	class:bg-brand-subtle-20={expanded}
>
	{#if !singleAddress}
		{@render header()}

		{#if expanded}
			<div class="mt-1 flex flex-col gap-1.5 md:pl-16" transition:slide={SLIDE_DURATION}>
				{#each contact.addresses as address, index (index)}
					<AddressListItem {address} hideCopyButton onClick={() => onClick(address)} />
				{/each}
			</div>
		{/if}
	{:else}
		{@render header()}
	{/if}
</div>
