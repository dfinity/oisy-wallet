<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';

	let visible = true;

	const banner = import.meta.env.MODE === 'staging';

	const close = () => (visible = false);
</script>

{#if banner && visible}
	<div>
		<h3>For <strong>TEST</strong> purpose only.</h3>
		<button on:click={close} aria-label="Close"><IconClose /></button>
	</div>
{/if}

<style lang="scss">
	@use '../../../../../../node_modules/@dfinity/gix-components/dist/styles/mixins/text';

	div {
		position: fixed;
		top: 0;
		left: 50%;
		transform: translate(-50%, 0);

		z-index: calc(var(--overlay-z-index) + 10);

		display: grid;
		grid-template-columns: 20% 60% 20%;

		justify-content: center;
		align-items: center;

		background: var(--negative-emphasis);

		padding: var(--padding-4x) var(--padding-3x);
		margin: var(--padding-2x) 0;

		border-radius: var(--border-radius-lg);

		width: calc(100% - var(--padding-4x));
		max-width: calc(768px + var(--padding-8x) + var(--padding-2x));

		box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1215686275);
	}

	h3 {
		@include text.clamp(2);

		margin: 0;

		grid-column-start: 2;

		text-align: center;

		color: inherit;
	}

	button {
		display: flex;
		justify-self: flex-end;
		margin: 0 var(--padding);
	}
</style>
