<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAvatar from '$lib/components/icons/IconAvatar.svelte';
	import { CONTACT_BACKGROUND_COLORS } from '$lib/constants/contact.constants';
	import type { AvatarVariants } from '$lib/types/style';
	import { selectColorForName } from '$lib/utils/contact.utils';

	interface AvatarProps {
		name?: string;
		variant?: AvatarVariants;
		styleClass?: string;
	}
	const { name, variant = 'md', styleClass }: AvatarProps = $props();

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

	let commonClasses = $derived(`${font} ${size} ${bgColor} relative z-1 rounded-full`);

	const initials = $derived(
		(nonNullish(name) ? name : '')
			.split(' ')
			.map((w) => w.slice(0, 1))
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

{#if !initials}
	<div class={`${commonClasses} text-brand-primary ${styleClass}`}>
		<IconAvatar size={`${size}`}></IconAvatar>
	</div>
{:else}
	<span
		class={`${commonClasses} inline-block inline-flex items-center justify-center font-bold text-white transition-colors duration-1000 ${styleClass}`}
		>{initials}</span
	>
{/if}
