<script lang="ts">
	interface Props {
		// Both width and height, in px (e.g. `'64'` in the hero, `'42'` in the info box).
		size?: string;
	}

	let { size = '64' }: Props = $props();

	// Unique per-instance prefix so the two marks on the provider page (hero + info
	// box) don't emit duplicate `clipPath` / `filter` ids and cross-resolve `url(#…)`.
	const uid = $props.id();
	const clipId = `oisyTradeMarkClip-${uid}`;
	const shadowId = `oisyTradeMarkShadow-${uid}`;
</script>

<svg
	aria-label="OISY TRADE"
	fill="none"
	height={size}
	role="img"
	viewBox="0 0 256 256"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<g clip-path="url(#{clipId})">
		<g filter="url(#{shadowId})">
			<circle cx="128" cy="128" fill="#06f" r="128" />
		</g>
		<rect
			height="76.447"
			opacity=".7"
			rx="7.767"
			stroke="#fff"
			stroke-width="2.335"
			transform="rotate(174.862 186.316 171.496)"
			width="37.462"
			x="186.316"
			y="171.496"
		/>
		<rect
			fill="#fff"
			height="74.721"
			rx="6.904"
			stroke="#fff"
			stroke-width="4.061"
			transform="rotate(174.862 193.501 163.403)"
			width="35.736"
			x="193.501"
			y="163.403"
		/>
		<path
			d="m143.17 103.413.172-.387a8.93 8.93 0 0 1 2.993-3.657l1.961-1.392q.565-.4 1.06-.882l4.903-4.771"
			stroke="#fff"
			stroke-width="2.335"
		/>
		<rect
			height="76.447"
			opacity=".7"
			rx="7.767"
			stroke="#fff"
			stroke-width="2.335"
			transform="rotate(174.862 106.457 173.063)"
			width="37.462"
			x="106.457"
			y="173.063"
		/>
		<rect
			fill="#fff"
			height="74.721"
			rx="6.904"
			stroke="#fff"
			stroke-width="4.061"
			transform="rotate(174.862 113.642 164.97)"
			width="35.736"
			x="113.642"
			y="164.97"
		/>
		<path
			d="m63.312 104.98.172-.387a8.94 8.94 0 0 1 2.993-3.657l1.961-1.392a9 9 0 0 0 1.06-.882l4.903-4.77"
			stroke="#fff"
			stroke-width="2.335"
		/>
		<path d="m99.65 168.241 9.875-.963.841 8.63-9.875.962z" fill="#06f" />
		<rect
			fill="#fff"
			height="119.649"
			rx="3.502"
			transform="rotate(174.86 101.929 188.565)"
			width="7.004"
			x="101.929"
			y="188.565"
		/>
		<rect
			fill="#fff"
			height="117.276"
			rx="3.502"
			transform="rotate(174.86 181.277 184.05)"
			width="7.004"
			x="181.277"
			y="184.05"
		/>
	</g>
	<defs>
		<clipPath id={clipId}>
			<rect fill="#fff" height="256" rx="128" width="256" />
		</clipPath>
		<filter
			id={shadowId}
			color-interpolation-filters="sRGB"
			filterUnits="userSpaceOnUse"
			height="260.151"
			width="260.151"
			x="-2"
			y="-2"
		>
			<feFlood flood-opacity="0" result="BackgroundImageFix" />
			<feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
			<feColorMatrix
				in="SourceAlpha"
				result="hardAlpha"
				values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
			/>
			<feOffset dx="4.303" dy="4.303" />
			<feGaussianBlur stdDeviation="1.076" />
			<feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
			<feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0" />
			<feBlend in2="shape" result="effect1_innerShadow_33_2" />
			<feColorMatrix
				in="SourceAlpha"
				result="hardAlpha"
				values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
			/>
			<feOffset dx="-3" dy="-2.5" />
			<feGaussianBlur stdDeviation="1" />
			<feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
			<feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
			<feBlend in2="effect1_innerShadow_33_2" result="effect2_innerShadow_33_2" />
		</filter>
	</defs>
</svg>
