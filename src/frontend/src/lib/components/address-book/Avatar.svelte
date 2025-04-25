<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	export type AvatarVariants = 'xl' | 'lg' | 'md' | 'sm' | 'xs';
	import IconAvatar from '$lib/components/icons/IconAvatar.svelte';

	interface AvatarProps {
		name?: string;
		variant?: AvatarVariants;
		styleClass?: string;
	}
	const { name, variant = 'md', styleClass }: AvatarProps = $props();

	const size = $derived(
		{
			xl: 100,
			lg: 64,
			md: 48,
			sm: 40,
			xs: 32
		}[variant]
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

{#if !initials}
	<div class={`text-brand-primary ${styleClass}`}>
		<IconAvatar size={`${size}`}></IconAvatar>
	</div>
{:else}
	<span
		style={`width: ${size}px; height: ${size}px; font-size: ${Math.ceil((size * 4) / 10)}px`}
		class={`inline-block inline-flex items-center justify-center rounded-full bg-[lightgray] text-4xl font-bold text-white ${styleClass}`}
		>{initials}</span
	>
{/if}
