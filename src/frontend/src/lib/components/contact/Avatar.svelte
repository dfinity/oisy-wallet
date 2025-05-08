<script lang="ts">
	import { isEmptyString, nonNullish } from '@dfinity/utils';
	import IconAvatar from '$lib/components/icons/IconAvatar.svelte';
	import type { AvatarVariants } from '$lib/types/style';

	interface AvatarProps {
		name?: string;
		variant?: AvatarVariants;
		styleClass?: string;
	}
	const { name, variant = 'md', styleClass }: AvatarProps = $props();
	// This constant is needed because all classes need to be somewhere in the
	// sourcecode. Otherwise tailwind will not include the classes in the css.
	// Compare: https://v3.tailwindcss.com/docs/content-configuration#class-detection-in-depth
	const COLORS = [
		`bg-contact-1`,
		`bg-contact-2`,
		`bg-contact-3`,
		`bg-contact-4`,
		`bg-contact-5`,
		`bg-contact-6`,
		`bg-contact-7`,
		`bg-contact-8`,
		`bg-contact-9`
	];

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

	const computeContactColor = (contactName?: string) => {
		const trimmedName = contactName?.trim?.();
		if (isEmptyString(trimmedName)) {
			return '';
		}

		let hash = 0;
		for (let i = 0; i < trimmedName.length; i++) {
			hash = (hash + trimmedName.charCodeAt(i)) % 9;
		}

		return COLORS[hash];
	};
	let bgColor = $derived(computeContactColor(name));

	let commonClasses = $derived(`${font} ${size} ${bgColor} rounded-full`);

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
