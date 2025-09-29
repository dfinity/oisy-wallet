<!-- source: ISC Lucide - please visit https://lucide.dev/license -->
<script lang="ts">
	interface Props {
		styleClass?: string;
		size?: string;
	}

	let { styleClass, size = '24' }: Props = $props();
</script>

<svg
	class={styleClass}
	fill="none"
	height={size}
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		clip-rule="evenodd"
		d="M7.15289 1.29289C7.34043 1.10536 7.59478 1 7.86 1H16.14C16.4052 1 16.6596 1.10536 16.8471 1.29289L22.7071 7.15289C22.8946 7.34043 23 7.59478 23 7.86V16.14C23 16.4052 22.8946 16.6596 22.7071 16.8471L16.8471 22.7071C16.6596 22.8946 16.4052 23 16.14 23H7.86C7.59478 23 7.34043 22.8946 7.15289 22.7071L1.29289 16.8471C1.10536 16.6596 1 16.4052 1 16.14V7.86C1 7.59478 1.10536 7.34043 1.29289 7.15289L7.15289 1.29289ZM8.27421 3L3 8.27421V15.7258L8.27421 21H15.7258L21 15.7258V8.27421L15.7258 3H8.27421Z"
		fill="currentColor"
		fill-rule="evenodd"
	/>
	<path
		clip-rule="evenodd"
		d="M12 7C12.5523 7 13 7.44772 13 8V12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12V8C11 7.44772 11.4477 7 12 7Z"
		fill="currentColor"
		fill-rule="evenodd"
	/>
	<path
		clip-rule="evenodd"
		d="M11 16C11 15.4477 11.4477 15 12 15H12.01C12.5623 15 13.01 15.4477 13.01 16C13.01 16.5523 12.5623 17 12.01 17H12C11.4477 17 11 16.5523 11 16Z"
		fill="currentColor"
		fill-rule="evenodd"
	/>
</svg>
