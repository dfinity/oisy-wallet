<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import emptyOisyLogo from '$lib/assets/oisy-logo-empty.svg';
	import AddressesBadge from '$lib/components/contact/AddressesBadge.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { AVATAR_WITH_BADGE_FALLBACK_IMAGE } from '$lib/constants/test-ids.constants';
	import type { Address } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';
	import type { AvatarVariants } from '$lib/types/style';
	import { mapAddressToContactAddressUi } from '$lib/utils/contact.utils';

	interface Props {
		contact?: ContactUi;
		badge?:
			| { type: 'addressTypeOrCount' }
			| {
					type: 'addressType';
					address: string;
			  };
		variant?: AvatarVariants;
		address?: Address;
	}

	const { contact, badge, variant, address }: Props = $props();

	let emptyOisyLogoSize = $derived(
		{
			xl: '100px',
			lg: '64px',
			md: '48px',
			sm: '40px',
			xs: '32px'
		}[variant ?? 'md']
	);
</script>

<div class="relative flex">
	{#if nonNullish(contact)}
		<Avatar name={contact.name} {variant} />

		{#if nonNullish(badge)}
			<AddressesBadge
				addresses={contact.addresses}
				selectedAddress={badge.type === 'addressType' ? badge.address : undefined}
			/>
		{/if}
	{:else}
		<Img
			src={emptyOisyLogo}
			width={emptyOisyLogoSize}
			height={emptyOisyLogoSize}
			testId={AVATAR_WITH_BADGE_FALLBACK_IMAGE}
		/>

		{#if nonNullish(address)}
			<AddressesBadge addresses={[mapAddressToContactAddressUi(address)]} />
		{/if}
	{/if}
</div>
