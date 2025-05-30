<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Divider from '$lib/components/common/Divider.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		address: Address;
		contact: ContactUi;
		onClick: () => void;
	}

	let { contact, address, onClick }: Props = $props();

	let contactLabel = $derived(
		nonNullish(contact)
			? contact.addresses.find(({ address }) => address === address)?.label
			: undefined
	);
</script>

<LogoButton styleClass="group" {onClick}>
	{#snippet logo()}
		<div class="mr-2">
			<AvatarWithBadge {contact} badge={{ type: 'addressType', address }} variant="sm" />
		</div>
	{/snippet}

	{#snippet title()}
		{contact.name}

		{#if nonNullish(contactLabel)}
			<Divider />
			{contactLabel}
		{/if}
	{/snippet}

	{#snippet description()}
		{shortenWithMiddleEllipsis({ text: address })}
	{/snippet}

	{#snippet descriptionEnd()}
		<div class="hidden text-brand-primary group-hover:block">
			{$i18n.send.text.send}
		</div>
	{/snippet}
</LogoButton>
