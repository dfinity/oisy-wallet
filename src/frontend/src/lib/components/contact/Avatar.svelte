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
		styleClass?: string;
	}

	const { name, variant = 'md', styleClass }: AvatarProps = $props();

	let imageUrl = $state<string | null>(null);

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

	async function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement)?.files?.[0];
		if (!file) {return;}
		try {
			const options = { maxSizeMB: 1, maxWidthOrHeight: 200, useWebWorker: true };
			const compressed = await imageCompression(file, options);
			const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
			imageUrl = null;
			await tick();
			imageUrl = dataUrl;
			console.log('Preview imageUrl:', imageUrl);
		} catch (err) {
			console.error('Image compression failed:', err);
		}
	}

	function triggerUpload() {
		document.getElementById('avatarUpload')?.click();
	}
</script>

<input id="avatarUpload" type="file" accept="image/*" class="hidden" onchange={handleFileChange} />

<button
	type="button"
	class={`${commonClasses} flex items-center justify-center ${!imageUrl ? bgColor : ''}`}
	aria-label={ariaLabel}
	onclick={triggerUpload}
>
	{#if imageUrl}
		<img src={imageUrl} alt={ariaLabel} class="h-full w-full rounded-full object-cover" />
	{:else if initials}
		<span class="font-bold text-white">{initials}</span>
	{:else}
		<Img styleClass={size} src={emptyOisyLogo} alt={ariaLabel} />
	{/if}
</button>
