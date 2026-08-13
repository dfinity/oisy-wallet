<script lang="ts">
	interface Props {
		size?: string;
	}

	const { size = '16px' }: Props = $props();
</script>

<span style="--spinner-size: {size}" class="relative flex">
	<svg
		class="spinner"
		aria-hidden="true"
		data-tid="spinner"
		focusable="false"
		preserveAspectRatio="xMidYMid meet"
		viewBox="0 0 100 100"
	>
		<circle cx="50%" cy="50%" r="45" />
	</svg>
</span>

<style lang="scss">
	.spinner {
		color: inherit;

		width: var(--spinner-size);
		height: var(--spinner-size);

		animation: app-spinner-rotate 800ms linear infinite;

		position: absolute;
		top: calc(50% - (var(--spinner-size) / 2));
		left: calc(50% - (var(--spinner-size) / 2));

		circle {
			// r=45 in a 100x100 viewBox → circumference ≈ 283; show a ~25% arc, hide the rest.
			stroke-dasharray: 70 213;
			stroke-width: 10%;
			stroke-linecap: round;
			fill: transparent;
			stroke: currentColor;
		}
	}

	@keyframes app-spinner-rotate {
		to {
			transform: rotate(360deg);
		}
	}
</style>
