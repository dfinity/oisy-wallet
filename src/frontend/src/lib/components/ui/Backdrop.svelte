<script lang="ts">
	import { fade } from 'svelte/transition';
	import { BACKDROP_FADE_OUT_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { stopPropagation } from '$lib/utils/event-modifiers.utils';
	import { handleKeyPress } from '$lib/utils/keyboard.utils';

	interface Props {
		disablePointerEvents?: boolean;
		invisible?: boolean;
		testId?: string;
		onClose?: () => void;
	}

	let {
		disablePointerEvents = false,
		invisible = false,
		testId = 'backdrop',
		onClose
	}: Props = $props();

	const close = () => onClose?.();

	const FADE_IN_DURATION = 75 as const;
</script>

<div
	class="backdrop"
	class:disablePointerEvents
	class:visible={!invisible}
	aria-label={$i18n.core.text.close}
	data-tid={testId}
	onclick={stopPropagation(close)}
	onkeypress={($event) => handleKeyPress({ $event, callback: close })}
	role="button"
	tabindex="-1"
	in:fade|global={{ duration: FADE_IN_DURATION }}
	out:fade|global={{ duration: BACKDROP_FADE_OUT_DURATION }}
></div>

<style lang="scss">
	@use '$lib/styles/mixins/interaction';
	@use '$lib/styles/mixins/display';

	.backdrop {
		position: absolute;
		@include display.inset;

		// Folded in from the former gix.scss override layer (this component now
		// owns its styling): --backdrop-contrast / --backdrop-filter.
		color: var(--color-foreground-primary-inverted);

		z-index: var(--backdrop-z-index);

		@include interaction.tappable;

		&.visible {
			background: var(--backdrop);
			backdrop-filter: blur(4px);
		}

		&.disablePointerEvents {
			@include interaction.none;
		}
	}
</style>
