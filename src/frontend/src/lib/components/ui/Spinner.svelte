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

		animation: app-spinner-linear-rotate 2000ms linear infinite;

		position: absolute;
		top: calc(50% - (var(--spinner-size) / 2));
		left: calc(50% - (var(--spinner-size) / 2));

		--radius: 45px;
		--circumference: calc(3.14159265359 * var(--radius) * 2);

		--start: calc((1 - 0.05) * var(--circumference));
		--end: calc((1 - 0.8) * var(--circumference));

		circle {
			stroke-dasharray: var(--circumference);
			stroke-width: 10%;
			transform-origin: 50% 50% 0;
			transition-property: stroke;
			animation-name: app-spinner-stroke-rotate-100;
			animation-duration: 4000ms;
			animation-timing-function: cubic-bezier(0.35, 0, 0.25, 1);
			animation-iteration-count: infinite;
			fill: transparent;
			stroke: currentColor;
			transition: stroke-dashoffset 225ms linear;
		}
	}
</style>
