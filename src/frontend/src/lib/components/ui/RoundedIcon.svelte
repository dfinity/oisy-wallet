<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		icon: Component;
		opacity?: boolean;
		colorStyle?: string;
		size?: string | number;
		styleClass?: string;
		iconClass?: string;
		positionClass?: string;
		paddingClass?: string;
		ariaLabel?: string;
		testId?: string;
	}

	const {
		icon: IconCmp,
		opacity = false,
		colorStyle = 'bg-primary',
		size = '16',
		styleClass = '',
		iconClass = '',
		positionClass = 'relative',
		paddingClass = 'p-3',
		ariaLabel,
		testId
	}: Props = $props();
</script>

<div
	class={`${positionClass} ${paddingClass} ${colorStyle} ${styleClass} flex items-center justify-center rounded-full ring-1 ring-brand-subtle-20`}
	aria-label={ariaLabel}
	data-tid={testId}
>
	<IconCmp
		style={`width:${size}px;height:${size}px`}
		class={`${iconClass} ${opacity ? 'opacity-10' : ''}`}
		{size}
	/>
</div>
