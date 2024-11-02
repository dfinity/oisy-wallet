<script lang="ts">
	import { getContext } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';

	export let disabled = false;
	export let testId: string | undefined = undefined;
	export let ariaLabel: string;

	const { loading } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<Button
	on:click
	{ariaLabel}
	{disabled}
	loading={$loading}
	{testId}
	colorStyle="tertiary"
	link
	paddingSmall
>
	<div class="flex flex-col items-center justify-center gap-2 lg:flex-row">
		<slot name="icon" />
		<div class="min-w-12 max-w-[72px] break-words text-sm lg:text-base">
			<slot />
		</div>
	</div>
</Button>
