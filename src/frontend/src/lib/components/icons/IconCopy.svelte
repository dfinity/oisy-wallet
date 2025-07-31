<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '20' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 20 20" width={size} xmlns="http://www.w3.org/2000/svg">
	<path
		d="M13.125 13.125H16.875V3.125H6.875V6.875"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
	<path
		d="M13.125 6.875H3.125V16.875H13.125V6.875Z"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
</svg>
