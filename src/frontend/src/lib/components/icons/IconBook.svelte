<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '21' }: Props = $props();
</script>

<svg
	fill="currentColor"
	height={size}
	viewBox="0 0 18 22"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		clip-rule="evenodd"
		d="M3.958 2.75a1.375 1.375 0 0 0-1.375 1.375v10.851c.426-.202.895-.31 1.375-.31h11.459V2.75H3.958Zm13.292-.917a.917.917 0 0 0-.917-.916H3.958A3.208 3.208 0 0 0 .75 4.125v13.75a3.209 3.209 0 0 0 3.208 3.208h12.375c.507 0 .917-.41.917-.916V1.833ZM15.417 16.5H3.958a1.375 1.375 0 0 0 0 2.75h11.459V16.5Z"
		fill="currentColor"
		fill-rule="evenodd"
	/>
</svg>
