<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import emptyOisyLogo from '$lib/assets/oisy-logo-empty.svg';
	import AddressesBadge from '$lib/components/contact/AddressesBadge.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { AVATAR_WITH_BADGE_FALLBACK_IMAGE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';
	import type { AvatarVariants } from '$lib/types/style';
	import { mapAddressToContactAddressUi } from '$lib/utils/contact.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

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

	const { contact, badge, variant = 'md', address }: Props = $props();

	let emptyOisyLogoSize = $derived(
		{
			xl: '100px',
			lg: '64px',
			md: '48px',
			sm: '40px',
			xs: '32px',
			xxs: '20px'
		}[variant]
	);

	let mappedAddress = $derived(
		nonNullish(address) ? mapAddressToContactAddressUi(address) : undefined
	);
</script>

<div class="relative flex">
	{#if nonNullish(contact)}
		<Avatar name={contact.name} image={contact.image} {variant} />

		{#if nonNullish(badge)}
			<AddressesBadge
				addresses={contact.addresses}
				selectedAddress={badge.type === 'addressType' ? badge.address : undefined}
			/>
		{/if}
	{:else}
		<Img
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME })}
			height={emptyOisyLogoSize}
			src={emptyOisyLogo}
			testId={AVATAR_WITH_BADGE_FALLBACK_IMAGE}
			width={emptyOisyLogoSize}
		/>

		{#if nonNullish(mappedAddress)}
			<AddressesBadge addresses={[mappedAddress]} />
		{/if}
	{/if}
</div>
