<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';
	import TestIdWrapper from '$lib/components/ui/TestIdWrapper.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CollapsibleProps } from '$lib/types/collapsible';
	import { handleKeyPress } from '$lib/utils/keyboard.utils';

	let {
		id,
		initiallyExpanded = false,
		maxContentHeight,
		testId = 'collapsible',
		iconSize = 'small',
		expandButton = true,
		externalToggle = false,
		wrapHeight = false,
		children,
		header,
		onToggle,
		expanded = $bindable(initiallyExpanded)
	}: CollapsibleProps = $props();

	// Minimum height when some part of the text-content is visible (empirical value)
	const CONTENT_MIN_HEIGHT = 40;

	let container = $state<HTMLDivElement | undefined>();
	let userUpdated = $state(false);
	let maxHeight = $state<number | undefined>();

	export const toggleContent = () => {
		userUpdated = true;
		expanded = !expanded;
		onToggle?.({ expanded });
	};

	const calculateMaxContentHeight = (): number => {
		if (nonNullish(maxContentHeight)) {
			return maxContentHeight;
		}
		const height = container?.getBoundingClientRect().height ?? container?.offsetHeight ?? 0;
		return height < CONTENT_MIN_HEIGHT ? CONTENT_MIN_HEIGHT : height;
	};
	const maxHeightStyle = (height: number | undefined): string =>
		isNullish(height) ? '' : `max-height: ${height}px;`;
	// In case of `initiallyExpanded=true` we should avoid calculating `max-height` from the content-height
	// because the content in the slot can be initialized w/ some delay.
	export const updateMaxHeight = () => {
		if (userUpdated) {
			maxHeight = expanded ? calculateMaxContentHeight() : 0;
		} else {
			maxHeight = initiallyExpanded ? maxContentHeight : 0;
		}
	};
	// Avoid to show scroll if not necessary
	const overflowYStyle = (height: number | undefined): string =>
		isNullish(height) || isNullish(maxContentHeight)
			? 'overflow-y: hidden;'
			: height < maxContentHeight
				? 'overflow-y: hidden;'
				: 'overflow-y: auto;';

	// recalculate max-height after DOM update
	$effect(updateMaxHeight);

	const toggle = () => (externalToggle ? undefined : toggleContent());
</script>

<TestIdWrapper {testId}>
	<div
		id={nonNullish(id) ? `heading${id}` : undefined}
		class={`header ${externalToggle ? 'external' : ''}`}
		data-tid="collapsible-header"
		onclick={toggle}
		onkeypress={($event) => handleKeyPress({ $event, callback: toggle })}
		role="button"
		tabindex={externalToggle ? -1 : 0}
	>
		<div class="header-content">
			{@render header()}
		</div>
		{#if expandButton}
			<button
				class="collapsible-expand-icon"
				class:expanded
				class:size-medium={iconSize === 'medium'}
				aria-controls={id}
				aria-expanded={expanded}
				data-tid="collapsible-expand-button"
				tabindex="-1"
				title={expanded ? $i18n.core.text.collapse : $i18n.core.text.expand}
			>
				<IconExpandMore />
			</button>
		{/if}
	</div>
	<div
		style={`${maxHeightStyle(maxHeight)}${overflowYStyle(maxHeight)}`}
		class="wrapper"
		class:expanded
		data-tid="collapsible-content"
		role="definition"
	>
		<div
			bind:this={container}
			{id}
			class="content"
			class:wrapHeight
			aria-labelledby={nonNullish(id) ? `heading${id}` : undefined}
		>
			{@render children()}
		</div>
	</div>
</TestIdWrapper>

<style lang="scss">
	@use '$lib/styles/mixins/interaction';
	@use '$lib/styles/mixins/media';

	.header {
		position: relative;

		display: flex;
		justify-content: center;

		outline: none;

		&:not(.external) {
			@include interaction.tappable;
			user-select: none;
		}

		.header-content {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: flex-start;
		}

		&:focus {
			filter: contrast(1.25);
		}
	}

	button {
		position: absolute;
		top: 0;
		bottom: 0;
		right: 0;
		width: var(--padding-4x);

		margin: 0;
		padding: 0;

		display: flex;
		align-items: center;

		:global(svg) {
			width: var(--padding-2x);
			transition: transform var(--animation-time-normal);
		}

		&.size-medium {
			:global(svg) {
				width: var(--padding-4x);
			}
		}
		&.expanded {
			:global(svg) {
				transform: rotate(180deg);
			}
		}
	}

	.wrapper {
		margin-top: 0;
		opacity: 0;
		visibility: hidden;

		transition: all var(--animation-time-normal);

		height: fit-content;
		overflow: hidden;

		&.expanded {
			margin-top: var(--padding);
			opacity: 1;
			visibility: initial;
		}
	}

	.content {
		// to respect children margins in contentHeight calculation
		overflow: auto;

		&:not(.wrapHeight) {
			// to not stick the content to the bottom
			padding-bottom: var(--padding);
		}
	}
</style>
