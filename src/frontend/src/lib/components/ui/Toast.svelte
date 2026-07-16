<!-- Ported from @dfinity/gix-components Toast. -->
<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount, type Component } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import IconCheckCircle from '$lib/components/icons/IconCheckCircle.svelte';
	import IconCloseThin from '$lib/components/icons/IconCloseThin.svelte';
	import IconError from '$lib/components/icons/IconError.svelte';
	import IconGixInfo from '$lib/components/icons/IconGixInfo.svelte';
	import IconGixWarning from '$lib/components/icons/IconGixWarning.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import LoaderSpinner from '$lib/components/ui/LoaderSpinner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsStore } from '$lib/stores/toasts.store';
	import type { ToastLevel, ToastMsgUI } from '$lib/types/toast';

	interface Props {
		msg: ToastMsgUI;
	}

	let { msg }: Props = $props();

	const iconMapper = (level: ToastLevel): Component | undefined =>
		({
			success: IconCheckCircle,
			warn: IconGixWarning,
			error: IconError,
			info: IconGixInfo,
			custom: undefined
		})[level];

	const close = () => toastsStore.hide(msg.id);

	let { text, level, spinner, title, overflow, position, icon, theme, renderAsHtml } =
		$derived(msg);

	let scroll = $derived(overflow === undefined || overflow === 'scroll');

	let truncate = $derived(overflow === 'truncate');

	let clamp = $derived(overflow === 'clamp');

	let timeoutId = $state<NodeJS.Timeout | undefined>();

	const autoHide = () => {
		const { duration } = msg;

		if (isNullish(duration)) {
			return;
		}

		timeoutId = setTimeout(close, duration);
	};

	const cleanUpAutoHide = () => {
		if (isNullish(timeoutId)) {
			return;
		}

		clearTimeout(timeoutId);
	};

	// To avoid having the scroll visible even when not needed.
	const minHeightMessage = 'min-height: 20px;';

	onMount(autoHide);
	onDestroy(cleanUpAutoHide);
</script>

<div
	class={`toast ${level} ${theme ?? 'themed'}`}
	data-tid="toast-component"
	role="dialog"
	in:fly|global={{ y: (position === 'top' ? -1 : 1) * 100, duration: 200 }}
	out:fade|global={{ delay: 100 }}
>
	<div class="icon {level}" aria-hidden="true">
		{#if spinner}
			<LoaderSpinner inline size="small" />
		{:else if nonNullish(icon)}
			{@const IconCmp = icon}
			<IconCmp />
		{:else if iconMapper(level)}
			{@const MappedIconCmp = iconMapper(level)}
			<MappedIconCmp size={20} />
		{/if}
	</div>

	<p
		style={minHeightMessage}
		class="msg"
		class:clamp
		class:scroll
		class:truncate
		data-tid="toast-message"
	>
		{#if nonNullish(title)}
			<span class="title">{title}</span>
		{/if}
		{#if renderAsHtml}
			<Html {text} />
		{:else}
			{text}
		{/if}
	</p>

	<button class="close" aria-label={$i18n.core.text.close} data-tid="close-button" onclick={close}
		><IconCloseThin /></button
	>
</div>

<style lang="scss">
	@use '$lib/styles/mixins/overlay';
	@use '$lib/styles/mixins/fonts';
	@use '$lib/styles/mixins/text';

	.toast {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--padding-1_5x);

		@include overlay.colors;

		border-radius: var(--border-radius);
		box-shadow: var(--strong-shadow, 8px 8px 16px 0 rgba(0, 0, 0, 0.25));

		padding: var(--padding-1_5x);
		box-sizing: border-box;

		background: var(--toast-background, var(--overlay-background));
		color: var(--toast-color, var(--overlay-background-contrast));

		&.success {
			--toast-background: var(--toast-success-background);
			--toast-color: var(--toast-success-color);
		}

		&.info {
			--toast-background: var(--toast-info-background);
			--toast-color: var(--toast-info-color);
		}

		&.warn {
			--toast-background: var(--toast-warn-background);
			--toast-color: var(--toast-warn-color);
		}

		&.error {
			--toast-background: var(--toast-error-background);
			--toast-color: var(--toast-error-color);
		}

		&.inverted {
			@include overlay.toast-inverted;

			--toast-background: var(--toast-inverted-background);
			--toast-color: var(--toast-inverted-background-contrast);

			&.success {
				--toast-background: var(--toast-success-inverted-background);
				--toast-color: var(--toast-success-inverted-color);
			}

			&.info {
				--toast-background: var(--toast-info-inverted-background);
				--toast-color: var(--toast-info-inverted-color);
			}

			&.warn {
				--toast-background: var(--toast-warn-inverted-background);
				--toast-color: var(--toast-warn-inverted-color);
			}

			&.error {
				--toast-background: var(--toast-error-inverted-background);
				--toast-color: var(--toast-error-inverted-color);
			}
		}

		.icon {
			line-height: 0;

			&.success {
				color: var(--positive-emphasis);
			}

			&.info {
				color: var(--primary);
			}

			&.warn {
				color: var(--warning-emphasis-shade);
			}

			&.error {
				color: var(--negative-emphasis);
			}
		}

		.msg {
			flex-grow: 1;

			margin: 0;
			word-break: break-word;

			&.scroll {
				overflow-y: auto;
				// >=3 lines x font-size x (line-height-normal=1.2 + extra-space=0.1 (needs for FF))
				max-height: calc(var(--font-size-standard) * 3 * 1.3);
				// Workaround to get rid of the redundant scrollbar (even when there is enough space).
				line-height: normal;
			}

			&.truncate {
				@include text.truncate;

				.title {
					@include text.truncate;
				}
			}

			&.clamp {
				@include text.clamp(3);

				.title {
					@include text.clamp(2);
				}
			}
		}

		.title {
			display: block;
			@include fonts.standard(true);
			// Workaround to get rid of the redundant scrollbar (even when there is enough space).
			line-height: normal;
		}

		button.close {
			padding: 0;
			line-height: 0;
			color: inherit;
		}
	}
</style>
