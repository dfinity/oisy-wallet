<script lang="ts">
	import { isEmptyString } from '@dfinity/utils';
	import Divider from '$lib/components/common/Divider.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		address: ContactAddressUi;
		contact: ContactUi;
		onClick?: () => void;
	}

	let { contact, address, onClick }: Props = $props();

	const { address: addressValue, label } = address;
</script>

<LogoButton {onClick} styleClass="bg-brand-subtle-10 mb-2 last:mb-0 hover:bg-brand-subtle-30">
	{#snippet logo()}
		<div class="mr-2">
			<AvatarWithBadge
				badge={{ type: 'addressType', address: addressValue }}
				{contact}
				variant="sm"
			/>
		</div>
	{/snippet}

	{#snippet title()}
		{contact.name}
	{/snippet}

	{#snippet description()}
		{#if !isEmptyString(label)}
			{label}
			<Divider />
		{/if}

		{shortenWithMiddleEllipsis({ text: addressValue })}
	{/snippet}
</LogoButton>
