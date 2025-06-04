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
>
	<div class="flex flex-col items-center justify-center gap-2 lg:flex-row">
		{@render icon()}
		<div class="min-w-12 max-w-[72px] break-words text-sm lg:text-base">
			{@render label()}
		</div>
	</div>
</Button>
