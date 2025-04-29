<script lang="ts">
	import { getContext } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';

	interface Props {
		onclick: () => void;
		disabled?: boolean;
		ariaLabel: string;
		testId?: string | undefined;
	}
	let { onclick, disabled = false, testId = undefined, ariaLabel }: Props = $props();

	const { loading } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<Button
	on:click={onclick}
	{ariaLabel}
	{disabled}
	loading={$loading}
	{testId}
	colorStyle="tertiary-main-card"
	paddingSmall
>
	<div class="flex flex-col items-center justify-center gap-2 lg:flex-row">
		<slot name="icon" />
		<div class="min-w-12 max-w-[72px] break-words text-sm lg:text-base">
			<slot />
		</div>
	</div>
</Button>
