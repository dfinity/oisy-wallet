<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle: string;
		icon: Snippet;
		onClick: () => void;
	}

	let { onClick, title, subtitle, icon }: Props = $props();
</script>

<button
	class="mb-2 flex w-full items-start rounded-xl bg-brand-subtle-10 px-2 py-2 transition last:mb-0 hover:bg-brand-light"
	aria-label={title}
	onclick={onClick}
>
	<span class="text-brand-primary">
		{@render icon()}
	</span>

	<span class="flex w-full flex-col text-left">
		<span class="text-sm font-bold">{title}</span>
		<span class="mt-0.5 block text-xs text-tertiary">{subtitle}</span>
	</span>
</button>
