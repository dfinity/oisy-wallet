<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '20' }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
	<path
		d="M13.125 13.125H16.875V3.125H6.875V6.875"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M13.125 6.875H3.125V16.875H13.125V6.875Z"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
