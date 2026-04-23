<!-- Microsoft logo — four-square brand mark (Microsoft Brand Guidelines). -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '20' }: Props = $props();
</script>

<svg
	fill="none"
	height={size}
	viewBox="0 0 20 20"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
>
	<path d="M0 0h9.5v9.5H0V0Z" fill="#F25124" />
	<path d="M10.5 0H20v9.5h-9.5V0Z" fill="#7EBA02" />
	<path d="M0 10.5h9.5V20H0v-9.5Z" fill="#01A3EE" />
	<path d="M10.5 10.5H20V20h-9.5v-9.5Z" fill="#FEBA01" />
</svg>
