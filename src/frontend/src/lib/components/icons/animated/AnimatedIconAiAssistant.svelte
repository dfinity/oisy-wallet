<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
		styleClass?: string;
	}

	let { size = '80', styleClass }: Props = $props();
</script>

<svg class={styleClass} fill="none" height={size} width={size} xmlns="http://www.w3.org/2000/svg">
	<!-- Back layer - appears last -->
	<g class="layer-back" filter="url(#a)">
		<path
			d="M39.9 66.0C25.5 66.0 13.9 54.4 13.9 40S25.5 13.9 39.9 13.9 66.0 25.5 66.0 40 54.4 66.0 39.9 66.0Z"
			fill="#0066FF"
		/>
	</g>

	<!-- 3 circle - rotates counterclockwise -->
	<circle class="layer-3-circle" cx="39.6" cy="38.8" fill="url(#b)" fill-opacity=".5" r="29.2" />

	<!-- 2 circle - rotates clockwise -->
	<circle class="layer-2-circle" cx="39.7" cy="38.9" fill="url(#c)" fill-opacity=".5" r="26.4" />

	<!-- 1 circle -->
	<circle
		class="layer-1-circle"
		cx="39.6"
		cy="38.9"
		fill="url(#d)"
		fill-opacity=".8"
		r="23.4"
		transform="rotate(165 39.6 38.9)"
	/>

	<!-- Front layer -->
	<g class="layer-front" filter="url(#e)">
		<ellipse cx="39.9" cy="38.8" fill="#06F" rx="25.2" ry="19.6" />
	</g>

	<!-- Eyes - move left-right -->
	<g class="layer-eyes">
		<rect fill="#fff" height="13.3" rx="2.0" width="7.1" x="28.2" y="31.8" />
		<rect fill="#fff" height="13.3" rx="2.0" width="7.1" x="43.7" y="31.8" />
	</g>

	<!-- Definitions for gradients and filters -->
	<defs>
		<radialGradient
			id="b"
			cx="0"
			cy="0"
			gradientTransform="rotate(66.588 0.75 28.5) scale(55.1)"
			gradientUnits="userSpaceOnUse"
			r="1"
		>
			<stop offset=".65" stop-color="#D9DFFF" stop-opacity="0" />
			<stop offset="1" stop-color="#fff" />
		</radialGradient>
		<radialGradient
			id="c"
			cx="0"
			cy="0"
			gradientTransform="rotate(66.588 -0.26 30.7) scale(49.8)"
			gradientUnits="userSpaceOnUse"
			r="1"
		>
			<stop offset=".65" stop-color="#D9DFFF" stop-opacity="0" />
			<stop offset="1" stop-color="#fff" />
		</radialGradient>
		<filter
			id="a"
			color-interpolation-filters="sRGB"
			filterUnits="userSpaceOnUse"
			height="79"
			width="79"
			x="0.5"
			y="0.5"
		>
			<feFlood flood-opacity="0" result="BackgroundImageFix" />
			<feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
			<feGaussianBlur result="effect1_foregroundBlur_223_13959" stdDeviation="6.0" />
		</filter>
		<filter
			id="e"
			color-interpolation-filters="sRGB"
			filterUnits="userSpaceOnUse"
			height="58"
			width="69"
			x="5.3"
			y="9.8"
		>
			<feFlood flood-opacity="0" result="BackgroundImageFix" />
			<feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
			<feGaussianBlur result="effect1_foregroundBlur_223_13959" stdDeviation="4.7" />
		</filter>
		<linearGradient id="d" gradientUnits="userSpaceOnUse" x1="45.2" x2="32.7" y1="14.7" y2="61.5">
			<stop offset=".05" stop-color="#D9DFFF" stop-opacity=".4" />
			<stop offset="1" stop-color="#fff" />
		</linearGradient>
	</defs>
</svg>

<style lang="scss">
	.layer-front {
		animation: fadeInEase 0.8s ease-out 0.1s both;
	}

	.layer-1-circle {
		animation: fadeInEase 0.8s ease-out 0.2s both;
	}

	.layer-2-circle {
		animation:
			fadeInEase 0.8s ease-out 0.3s both,
			rotateCW 4s linear 1.5s infinite;
		transform-origin: 39.7px 38.9px;
	}

	.layer-3-circle {
		animation:
			fadeInEase 0.8s ease-out 0.4s both,
			rotateCCW 3s linear 1.5s infinite;
		transform-origin: 39.6px 38.8px;
	}

	.layer-back {
		animation: fadeInEase 0.8s ease-out 0.5s both;
	}

	.layer-eyes {
		animation:
			fadeInEase 0.8s ease-out 0.1s both,
			eyeMoveLoop 16s ease-in-out 2s infinite;
	}

	/* Keyframe animations */
	@keyframes fadeInEase {
		0% {
			opacity: 0;
			transform: scale(0.8) translateY(20px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@keyframes rotateCW {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes rotateCCW {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(-360deg);
		}
	}

	@keyframes eyeMove {
		0%,
		100% {
			transform: translateX(0);
		}
		16.66% {
			transform: translateX(2.1px);
		}
		33.33% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(-2.1px);
		}
		66.66% {
			transform: translateX(0);
		}
		83.33% {
			transform: translateX(2.1px);
		}
	}

	@keyframes eyeMoveLoop {
		/* 3 cycles of eye movement (0% to 37.5% = 6 seconds out of 16) */
		0% {
			transform: translateX(0);
		}
		6.25% {
			transform: translateX(2.1px);
		}
		12.5% {
			transform: translateX(0);
		}
		18.75% {
			transform: translateX(-2.1px);
		}
		25% {
			transform: translateX(0);
		}
		31.25% {
			transform: translateX(2.1px);
		}
		37.5% {
			transform: translateX(0);
		}
		/* 10-second pause (37.5% to 100% = 10 seconds) */
		37.5%,
		100% {
			transform: translateX(0);
		}
	}
</style>
