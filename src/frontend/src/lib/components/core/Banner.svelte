<script lang="ts">
	import { IconClose, IconWarning } from '@dfinity/gix-components';
	import { STAGING } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';

	let visible = true;

	const close = () => (visible = false);
</script>

{#if STAGING && visible}
	<div class="flex justify-between gap-4">
		<span class="flex items-center justify-center gap-4">
			<IconWarning size="48px" />
			<h3 class="clamp-4">{$i18n.core.info.test_banner}</h3>
		</span>
		<button aria-label={$i18n.core.text.close} on:click={close}><IconClose /></button>
	</div>
{/if}

<style lang="scss">
	div {
		position: fixed;
		top: 0;
		left: 50%;
		transform: translate(-50%, 0);

		z-index: calc(var(--overlay-z-index) + 10);

		background: var(--color-background-error-primary);

		padding: var(--padding-2x) var(--padding-3x);
		margin: var(--padding-3x) 0;

		border-radius: var(--border-radius);

		border: 4px solid black;

		width: calc(100% - var(--padding-4x));
		max-width: 768px;

		box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1215686275);
	}
</style>
