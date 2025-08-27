<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: Snippet;
		label: Snippet;
		onClick: () => void;
		asMenuItem?: boolean;
		asMenuItemCondensed?: boolean;
		testId?: string;
	}

	let {
		icon,
		label,
		onClick,
		asMenuItem = false,
		asMenuItemCondensed = false,
		testId
	}: Props = $props();
</script>

<button
	class:font-bold={!asMenuItem}
	class:nav-item={asMenuItem}
	class:nav-item-condensed={asMenuItemCondensed}
	class:text={asMenuItem}
	class:text-brand-primary-alt={!asMenuItem}
	class:text-center={!asMenuItem}
	class:whitespace-nowrap={!asMenuItem}
	data-tid={testId}
	onclick={onClick}
>
	<div class="flex items-center gap-2">
		{#if asMenuItem}
			{@render icon?.()}
		{/if}
		{@render label()}
	</div>
</button>
