<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import IconCloseThin from '$lib/components/icons/IconCloseThin.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ModalProps } from '$lib/types/modal';
	import { stopPropagation } from '$lib/utils/event-modifiers.utils';
	import { nextElementId } from '$lib/utils/html.utils';

	let {
		visible = true,
		role = 'dialog',
		testId,
		disablePointerEvents = false,
		title,
		headerLeft,
		headerRight,
		subTitle,
		footer,
		children,
		onClose,
		onIntroEnd,
		onClick
	}: ModalProps = $props();

	let showHeader = $derived(nonNullish(title));

	let showHeaderLeft = $derived(nonNullish(headerLeft));

	/**
	 * @deprecated According to the new design, there should be no sticky footer.
	 */
	let showFooterAlert = $derived(nonNullish(footer) && role === 'alert');

	const close = () => onClose?.();

	// A bit faster fade in that backdrop IN, a bit slower on OUT
	const FADE_IN_DURATION = 125 as const;
	const FADE_OUT_DURATION = 200 as const;

	const modalTitleId = nextElementId('modal-title-');
	const modalContentId = nextElementId('modal-content-');

	const handleKeyDown = ({ key }: KeyboardEvent) => {
		// Check for $busy to mock the same behaviour as the close button being covered by the busy overlay
		if (visible && !disablePointerEvents && !get(busy) && key === 'Escape') {
			close();
		}
	};
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if visible}
	<div
		class="modal"
		aria-describedby={modalContentId}
		aria-labelledby={showHeader ? modalTitleId : undefined}
		data-tid={testId}
		onclick={stopPropagation(onClick)}
		onintroend={onIntroEnd}
		{role}
		transition:fade|global={{ duration: 25 }}
	>
		<Backdrop {disablePointerEvents} onClose={() => onClose?.()} />
		<div
			class={`wrapper ${role}`}
			in:fade|global={{ duration: FADE_IN_DURATION }}
			out:fade|global={{ duration: FADE_OUT_DURATION }}
		>
			{#if showHeader}
				<div class="header">
					{#if showHeaderLeft}
						<div class="header-left">
							{@render headerLeft?.()}
						</div>
					{/if}

					<h2 id={modalTitleId} data-tid="modal-title">
						{@render title?.()}
					</h2>

					<div class="header-right">
						{@render headerRight?.()}

						{#if !disablePointerEvents}
							<button
								aria-label={$i18n.core.text.close}
								data-tid="close-modal"
								onclick={stopPropagation(close)}
							>
								<IconCloseThin size="24px" />
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<div class="container-wrapper">
				{@render subTitle?.()}

				<div class="container">
					<div id={modalContentId} class="content" class:alert={role === 'alert'}>
						{@render children()}
					</div>
				</div>
			</div>

			{#if showFooterAlert}
				<div class="footer toolbar">
					{@render footer?.()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins/interaction';
	@use '$lib/styles/mixins/text';
	@use '$lib/styles/mixins/display';
	@use '$lib/styles/mixins/media';

	.modal {
		position: fixed;
		display: flex;
		justify-content: center;
		align-items: center;
		@include display.inset;

		z-index: var(--modal-z-index);

		@include interaction.initial;
	}

	.wrapper {
		position: absolute;
		left: 0;
		right: 0;
		margin: auto;

		display: flex;
		flex-direction: column;

		background: var(--overlay-background);
		color: var(--overlay-background-contrast);
		--button-secondary-background: var(--focus-background);

		overflow: hidden;

		box-sizing: border-box;

		box-shadow: var(--overlay-box-shadow);

		.container-wrapper {
			margin: var(--padding-1_5x) var(--padding-2x) auto;

			display: flex;
			flex-direction: column;
			gap: var(--padding-1_5x);
			flex: 1;

			overflow: hidden;
		}

		&.alert {
			width: var(--alert-width);
			max-width: var(--alert-max-width);

			max-height: var(--alert-max-height);

			border-radius: var(--alert-border-radius);

			.header {
				padding: var(--alert-padding-y) var(--alert-padding-x) var(--padding);
			}

			.container-wrapper {
				margin-bottom: calc(var(--alert-padding-y) * 2 / 3);
			}

			.content {
				margin: 0 0 calc(var(--alert-padding-y) / 2);
				padding: calc(var(--alert-padding-y) / 2) calc(var(--alert-padding-x) / 2) 0;

				flex-grow: 1;
				display: flex;
				flex-direction: column;
			}

			.footer {
				padding: 0 var(--alert-padding-x) calc(var(--alert-padding-y) * 2 / 3);

				@include media.min-width(small) {
					justify-content: flex-end;
				}
			}
		}

		&.dialog {
			width: var(--dialog-width);
			max-width: var(--dialog-max-width);

			min-height: var(--dialog-min-height);
			height: var(--dialog-height);
			max-height: var(--dialog-max-height, 100%);

			border-radius: var(--dialog-border-radius);

			@supports (-webkit-touch-callout: none) {
				max-height: -webkit-fill-available;

				@include media.min-width(medium) {
					max-height: var(--dialog-max-height, 100%);
				}
			}

			.header {
				padding: var(--dialog-padding-y) var(--padding-3x) var(--padding);
			}

			.container-wrapper {
				margin-bottom: var(--dialog-padding-y);
			}

			.content {
				margin: 0;
				padding: var(--dialog-padding-y) var(--dialog-padding-x);
				flex-grow: 1;
				display: flex;
				flex-direction: column;
			}
		}
	}

	.header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: var(--padding);

		z-index: var(--z-index);

		position: relative;

		.header-left {
			display: flex;
			justify-content: flex-start;
			align-items: center;
		}

		h2 {
			@include text.truncate;
			grid-column-start: 2;
			text-align: center;
		}

		.header-right {
			display: flex;
			justify-content: flex-end;
			align-items: center;
		}

		button {
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 0;
			&:active,
			&:focus,
			&:hover {
				background: var(--background-shade);
				border-radius: var(--border-radius);
			}
		}
	}

	.content {
		overflow-y: var(--modal-content-overflow-y, auto);
		overflow-x: hidden;
	}

	.container {
		position: relative;

		display: flex;
		flex-direction: column;

		flex: 1;

		overflow: hidden;
		border-radius: 16px;

		background: var(--overlay-content-background);
		color: var(--overlay-content-background-contrast);
	}
</style>
