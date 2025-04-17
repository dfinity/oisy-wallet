<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	export type AvatarVariants = 'xl' | 'lg' | 'md' | 'sm' | 'xs';
	import IconAvatar from '$lib/components/icons/IconAvatar.svelte';

	const { name, variant = 'md' }: { name?: string; variant?: AvatarVariants } = $props();

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
	<div class="text-brand-primary">
		<IconAvatar size={`${size}`}></IconAvatar>
	</div>
{:else}
	<span
		style={`width: ${size}px; height: ${size}px; font-size: ${Math.ceil((size * 4) / 10)}px`}
		class="inline-block inline-flex items-center justify-center rounded-full bg-[lightgray] text-4xl"
		>{initials}</span
	>
{/if}
