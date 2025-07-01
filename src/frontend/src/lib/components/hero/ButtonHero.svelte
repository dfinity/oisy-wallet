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
		testId?: string | undefined;
	}
	let { icon, label, onclick, disabled = false, testId = undefined, ariaLabel }: Props = $props();

	const { loading } = getContext<HeroContext>(HERO_CONTEXT_KEY);
</script>

<Button
	{onclick}
	{ariaLabel}
	{disabled}
	loading={$loading}
	{testId}
	colorStyle="tertiary-main-card"
	paddingSmall
	styleClass="py-1 min-w-0"
>
	<div class="flex min-w-0 flex-col items-center justify-center">
		{@render icon()}
		<span class="block w-full truncate text-xs">
			{@render label()}
		</span>
	</div>
</Button>
