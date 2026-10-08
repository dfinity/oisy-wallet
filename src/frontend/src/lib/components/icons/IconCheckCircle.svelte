<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string | number;
	}

	let { size = '24px' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
	<rect
		fill="var(--icon-check-circle-background, transparent)"
		height="21.5"
		rx="10.75"
		width="21.5"
		x="1.25"
		y="1.25"
	/>
	<path
		d="M7 11L11 15L17 9"
		stroke="var(--icon-check-circle-color, currentColor)"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
	<rect
		height="21.5"
		rx="10.75"
		stroke="var(--icon-check-circle-background, currentColor)"
		stroke-width="1.5"
		width="21.5"
		x="1.25"
		y="1.25"
	/>
</svg>
