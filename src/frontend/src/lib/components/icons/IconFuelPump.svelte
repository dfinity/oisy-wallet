<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<!-- Drawn like its neighbours in the hero row: a solid shape over a 40% one. -->
<svg
	fill="currentColor"
	height={size}
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<rect height="17" opacity="0.4" rx="2.5" width="11" x="3" y="3" />
	<rect height="4.5" rx="1" width="6.5" x="5.25" y="5.5" />
	<rect height="2.5" rx="1.25" width="13" x="2" y="19.25" />
	<path
		d="M14 8.25H16.25C17.2165 8.25 18 9.0335 18 10V16.25C18 16.9404 18.5596 17.5 19.25 17.5C19.9404 17.5 20.5 16.9404 20.5 16.25V7.75L18 5.25"
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.75"
	/>
</svg>
