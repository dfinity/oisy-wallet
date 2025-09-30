<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';

	interface Props {
		icon: Snippet;
		label: Snippet;
		onclick: () => void;
		disabled?: boolean;
		ariaLabel: string;
		testId?: string;
	}

	let { icon, label, onclick, disabled = false, testId, ariaLabel }: Props = $props();

	const { loading } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<Button
	{ariaLabel}
	colorStyle="tertiary-main-card"
	{disabled}
	loading={$loading}
	{onclick}
	paddingSmall
	styleClass="py-1 min-w-0"
	{testId}
>
	<div class="flex min-w-0 flex-col items-center justify-center">
		{@render icon()}
		<span class="block w-full truncate text-xs sm:text-sm 1.5md:text-base">
			{@render label()}
		</span>
	</div>
</Button>
