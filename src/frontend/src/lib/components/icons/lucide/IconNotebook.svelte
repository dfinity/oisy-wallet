<!-- source: ISC Lucide - please visit https://lucide.dev/license -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
	<path
		d="M5.5 6.5A3 3 0 0 1 8.5 3.5H14.5A3 3 0 0 1 17.5 6.5V12L13 18.5H8.5A3 3 0 0 1 5.5 15.5Z"
		fill="currentColor"
		opacity="0.35"
	/>
	<path d="M12 18.4L18.6 11.8L21 14.2L14.4 20.8Z" fill="currentColor" />
	<path
		d="M18.6 11.8L21 14.2L22 13.2A1.2 1.2 0 0 0 22 11.5L21.3 10.8A1.2 1.2 0 0 0 19.6 10.8Z"
		fill="currentColor"
	/>
	<path d="M12 18.4L14.4 20.8L11.2 21.8Z" fill="currentColor" />
</svg>
