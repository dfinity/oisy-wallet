<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string | number;
	}

	let { size = '24' }: Props = $props();
</script>

<svg
	fill="none"
	height={size}
	stroke="currentColor"
	viewBox="0 0 20 20"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path d="M19 10L2 10" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
	<path d="M9 2L1 10L9 18" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
</svg>
