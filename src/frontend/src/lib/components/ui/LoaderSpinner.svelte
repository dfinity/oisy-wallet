<!-- adapted source: https://github.com/angular/components/tree/master/src/material/progress-spinner -->
<script lang="ts">
	interface Props {
		inline?: boolean;
		size?: 'tiny' | 'small' | 'medium';
	}

	let { inline = false, size = 'medium' }: Props = $props();
</script>

<svg
	class={size}
	class:inline
	aria-hidden="true"
	data-tid="spinner"
	focusable="false"
	preserveAspectRatio="xMidYMid meet"
	viewBox="0 0 100 100"><circle cx="50%" cy="50%" r="45" /></svg
>

<style lang="scss">
	@use 'sass:math';

	.medium {
		--spinner-size: 30px;
	}

	.small {
		--spinner-size: calc(var(--line-height-standard) * 1rem);
	}

	.tiny {
		--spinner-size: calc(var(--line-height-standard) * 0.5rem);
	}

	svg {
		width: var(--spinner-size);
		height: var(--spinner-size);

		animation: spinner-linear-rotate 2000ms linear infinite;

		position: absolute;
		top: calc(50% - (var(--spinner-size) / 2));
		left: calc(50% - (var(--spinner-size) / 2));

		// same as <circle r=""/> attribute
		--radius: 45px;
		--circumference: calc(#{math.$pi} * var(--radius) * 2);

		// start the animation at 5%
		--start: calc((1 - 0.05) * var(--circumference));
		--end: calc((1 - 0.8) * var(--circumference));

		&.inline {
			display: inline-block;
			position: relative;
		}
	}

	circle {
		stroke-dasharray: var(--circumference);
		stroke-width: 10%;
		transform-origin: 50% 50% 0;

		transition-property: stroke;

		animation-name: spinner-stroke-rotate-100;
		animation-duration: 4000ms;
		animation-timing-function: cubic-bezier(0.35, 0, 0.25, 1);
		animation-iteration-count: infinite;

		fill: transparent;
		stroke: currentColor;

		transition: stroke-dashoffset 225ms linear;
	}

	/* -global- */
	@keyframes -global-spinner-linear-rotate {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* -global- */
	@keyframes -global-spinner-stroke-rotate-100 {
		0% {
			stroke-dashoffset: var(--start);
			transform: rotate(0);
		}
		12.5% {
			stroke-dashoffset: var(--end);
			transform: rotate(0);
		}
		12.5001% {
			stroke-dashoffset: var(--end);
			transform: rotateX(180deg) rotate(72.5deg);
		}
		25% {
			stroke-dashoffset: var(--start);
			transform: rotateX(180deg) rotate(72.5deg);
		}

		25.0001% {
			stroke-dashoffset: var(--start);
			transform: rotate(270deg);
		}
		37.5% {
			stroke-dashoffset: var(--end);
			transform: rotate(270deg);
		}
		37.5001% {
			stroke-dashoffset: var(--end);
			transform: rotateX(180deg) rotate(161.5deg);
		}
		50% {
			stroke-dashoffset: var(--start);
			transform: rotateX(180deg) rotate(161.5deg);
		}

		50.0001% {
			stroke-dashoffset: var(--start);
			transform: rotate(180deg);
		}
		62.5% {
			stroke-dashoffset: var(--end);
			transform: rotate(180deg);
		}
		62.5001% {
			stroke-dashoffset: var(--end);
			transform: rotateX(180deg) rotate(251.5deg);
		}
		75% {
			stroke-dashoffset: var(--start);
			transform: rotateX(180deg) rotate(251.5deg);
		}

		75.0001% {
			stroke-dashoffset: var(--start);
			transform: rotate(90deg);
		}
		87.5% {
			stroke-dashoffset: var(--end);
			transform: rotate(90deg);
		}
		87.5001% {
			stroke-dashoffset: var(--end);
			transform: rotateX(180deg) rotate(341.5deg);
		}
		100% {
			stroke-dashoffset: var(--start);
			transform: rotateX(180deg) rotate(341.5deg);
		}
	}
</style>
