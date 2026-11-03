<!-- source: ISC Lucide - please visit https://lucide.dev/license -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
	<circle cx="15" cy="15" fill="currentColor" opacity="0.4" r="5.5" />
	<circle cx="9.5" cy="9.5" fill="none" r="6.5" stroke="currentColor" stroke-width="2" />
	<path
		d="M8.3 8.4L9.7 7.4V12.2"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.7"
	/>
</svg>
