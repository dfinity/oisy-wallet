<!-- source: ISC Lucide - please visit https://lucide.dev/license -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg
	fill="none"
	height={size}
	stroke="currentColor"
	stroke-linecap="round"
	stroke-linejoin="round"
	stroke-width="2"
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<circle cx="12" cy="12" r="10" />
	<path d="m4.93 4.93 4.24 4.24" />
	<path d="m14.83 9.17 4.24-4.24" />
	<path d="m14.83 14.83 4.24 4.24" />
	<path d="m9.17 14.83-4.24 4.24" />
	<circle cx="12" cy="12" r="4" />
</svg>
