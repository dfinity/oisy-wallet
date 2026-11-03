<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string | number;
	}

	let { size = '20px' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 20 20" width={size} xmlns="http://www.w3.org/2000/svg">
	<rect
		fill="currentColor"
		height="14"
		rx="0.75"
		transform="rotate(45 14.4194 4.52441)"
		width="1.5"
		x="14.4194"
		y="4.52441"
	/>
	<rect
		fill="currentColor"
		height="14"
		rx="0.75"
		transform="rotate(-45 4.5199 5.58496)"
		width="1.5"
		x="4.5199"
		y="5.58496"
	/>
</svg>
