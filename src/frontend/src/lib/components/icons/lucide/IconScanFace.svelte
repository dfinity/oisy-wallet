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
	<path d="M3 7V5a2 2 0 0 1 2-2h2" />
	<path d="M17 3h2a2 2 0 0 1 2 2v2" />
	<path d="M21 17v2a2 2 0 0 1-2 2h-2" />
	<path d="M7 21H5a2 2 0 0 1-2-2v-2" />
	<path d="M8 14s1.5 2 4 2 4-2 4-2" />
	<path d="M9 9h.01" />
	<path d="M15 9h.01" />
</svg>
