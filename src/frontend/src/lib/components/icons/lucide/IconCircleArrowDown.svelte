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
	<path d="M12 8v8" />
	<path d="m8 12 4 4 4-4" />
</svg>
