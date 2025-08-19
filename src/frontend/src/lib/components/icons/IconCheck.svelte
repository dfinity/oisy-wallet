<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '32' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 32 32" width={size} xmlns="http://www.w3.org/2000/svg">
	<path
		clip-rule="evenodd"
		d="M27.6095 7.05727C28.1302 7.57797 28.1302 8.42219 27.6095 8.94289L12.9428 23.6096C12.4221 24.1303 11.5779 24.1303 11.0572 23.6096L4.39052 16.9429C3.86983 16.4222 3.86983 15.578 4.39052 15.0573C4.91122 14.5366 5.75544 14.5366 6.27614 15.0573L12 20.7811L25.7239 7.05727C26.2446 6.53657 27.0888 6.53657 27.6095 7.05727Z"
		fill="currentColor"
		fill-rule="evenodd"
	/>
</svg>
