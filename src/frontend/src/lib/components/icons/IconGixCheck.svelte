<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string | number;
	}

	let { size = '24px' }: Props = $props();
</script>

<svg
	fill="none"
	height={size}
	stroke="currentColor"
	viewBox="0 0 20 20"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M16.875 6.29163L8.125 15.0416L3.75 10.6666"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
</svg>
