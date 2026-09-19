<!-- source: ISC Lucide - please visit https://lucide.dev/license -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
	<path
		d="M10 2V9.5L4.7 20.6A1 1 0 0 0 5.6 22H18.4A1 1 0 0 0 19.3 20.6L14 9.5V2"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
	/>
	<path
		d="M8.5 2H15.5"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
	/>
	<path
		d="M7 16H17"
		opacity="0.4"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
	/>
</svg>
