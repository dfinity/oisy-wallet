<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '20' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 20 20" width={size} xmlns="http://www.w3.org/2000/svg">
	<path
		d="M10 3H17V10"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
	<path
		d="M8 12L16.5 3.5"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
	<path
		d="M6 5H3V17H15V14"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
</svg>
