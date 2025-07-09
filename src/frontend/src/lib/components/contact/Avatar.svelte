<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import imageCompression from 'browser-image-compression';
	import { tick } from 'svelte';
	import emptyOisyLogo from '$lib/assets/oisy-logo-empty.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { CONTACT_BACKGROUND_COLORS } from '$lib/constants/contact.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { AvatarVariants } from '$lib/types/style';
	import { selectColorForName } from '$lib/utils/contact.utils';

	interface AvatarProps {
		name?: string;
		variant?: AvatarVariants;
		imageUrl?: string | null;
		styleClass?: string;
	}
	const { name, imageUrl = null, variant = 'md', styleClass }: AvatarProps = $props();

	const font = $derived(
		{
			xl: 'text-[32px]', // size: 100px
			lg: 'text-[25.6px]', // size: 64px
			md: 'text-[19.2px]', // size: 48px
			sm: 'text-[16px]', // size: 40px
			xs: 'text-[12.8px]' // size: 32px
		}[variant]
	);

	let size = $derived(variant === 'xl' ? 'size-25' : 'size-[2.5em]');
	let bgColor = $derived(selectColorForName({ name, colors: CONTACT_BACKGROUND_COLORS }));
	const commonClasses = $derived(
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
	
</script>

<button
	type="button"
	class={`${commonClasses} flex items-center justify-center ${!imageUrl ? bgColor : ''}`}
	aria-label={ariaLabel}
>
	{#if imageUrl}
		<img src={imageUrl} alt={ariaLabel} class="h-full w-full rounded-full object-cover" />
	{:else if initials}
		<span class="font-bold text-white">{initials}</span>
	{:else}
		<Img styleClass={size} src={emptyOisyLogo} alt={ariaLabel} />
	{/if}
</button>
