<script lang="ts">
	interface Props {
		size?: string;
	}
	const { size = '24' }: Props = $props();
</script>

<svg
	fill="none"
	height={size}
	stroke="currentColor"
	stroke-linecap="round"
	stroke-linejoin="round"
	stroke-width="1.25"
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
	><path d="M0 0h24v24H0z" fill="none" stroke="none" /><path d="M4 5h7" /><path
		d="M9 3v2c0 4.418 -2.239 8 -5 8"
	/><path d="M5 9c0 2.144 2.952 3.908 6.7 4" /><path d="M12 20l4 -9l4 9" /><path
		d="M19.1 18h-6.2"
	/></svg
>
