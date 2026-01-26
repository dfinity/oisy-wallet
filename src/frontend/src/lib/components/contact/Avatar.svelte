<script lang="ts">
	import { nonNullish, isNullish } from '@dfinity/utils';
	import type { ContactImage } from '$declarations/backend/backend.did';
	import emptyOisyLogo from '$lib/assets/oisy-logo-empty.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import LoaderWithOverlay from '$lib/components/ui/LoaderWithOverlay.svelte';
	import { CONTACT_BACKGROUND_COLORS } from '$lib/constants/contact.constants';
	import { AVATAR_IMAGE, AVATAR_LOADER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { AvatarVariants } from '$lib/types/style';
	import { imageToDataUrl } from '$lib/utils/contact-image.utils';
	import { selectColorForName } from '$lib/utils/contact.utils';

	interface AvatarProps {
		name?: string;
		variant?: AvatarVariants;
		image?: ContactImage | null;
		styleClass?: string;
		loading?: boolean;
	}

	const { name, image, variant = 'md', styleClass, loading }: AvatarProps = $props();

	const font = $derived(
		{
			xl: 'text-[32px]', // size: 100px
			lg: 'text-[25.6px]', // size: 64px
			md: 'text-[19.2px]', // size: 48px
			sm: 'text-[16px]', // size: 40px
			xs: 'text-[12.8px]', // size: 32px
			xxs: 'text-[8px]' // size: 20px
		}[variant]
	);

	let size = $derived(variant === 'xl' ? 'size-25' : 'size-[2.5em]');
	let bgColor = $derived(selectColorForName({ name, colors: CONTACT_BACKGROUND_COLORS }));

	let commonClasses = $derived(
		`${font} ${size} ${bgColor} rounded-full overflow-hidden relative ${styleClass}`
	);

	let ariaLabel = $derived(
		name ? `${$i18n.address_book.avatar.avatar_for} ${name}` : $i18n.address_book.avatar.default
	);

	const initials = $derived(
		(nonNullish(name) ? name : '')
			.split(' ')
			.map((w) => w.slice(0, 1))
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);

	const blobUrl = $derived(nonNullish(image) ? imageToDataUrl(image) : null);
</script>

<div
	class={`${commonClasses} relative flex items-center justify-center ${isNullish(blobUrl) ? bgColor : ''}`}
	aria-label={ariaLabel}
	data-tid={AVATAR_IMAGE}
>
	{#if loading}
		<LoaderWithOverlay
			ariaLabel={$i18n.address_book.avatar.avatar_loading}
			testId={AVATAR_LOADER}
		/>
	{:else if nonNullish(blobUrl)}
		<Img alt={ariaLabel} rounded src={blobUrl} styleClass="h-full w-full object-cover" />
	{:else if nonNullish(initials)}
		<span class="font-bold text-white">{initials}</span>
	{:else}
		<Img alt={ariaLabel} src={emptyOisyLogo} styleClass={size} />
	{/if}
</div>
