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
	<path d="M1 10L18 10" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
	<path d="M11 18L19 10L11 2" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
</svg>
