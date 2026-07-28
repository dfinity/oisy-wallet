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
	fill="currentColor"
	height={size}
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4Z"
		opacity="0.4"
	/>
	<path
		clip-rule="evenodd"
		d="M11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4ZM2 11C2 6.02944 6.02944 2 11 2C15.9706 2 20 6.02944 20 11C20 15.9706 15.9706 20 11 20C6.02944 20 2 15.9706 2 11Z"
		fill-rule="evenodd"
	/>
	<path
		clip-rule="evenodd"
		d="M15.9931 15.9931C16.3836 15.6026 17.0168 15.6026 17.4073 15.9931L21.7073 20.2931C22.0978 20.6836 22.0978 21.3168 21.7073 21.7073C21.3168 22.0978 20.6836 22.0978 20.2931 21.7073L15.9931 17.4073C15.6026 17.0168 15.6026 16.3836 15.9931 15.9931Z"
		fill-rule="evenodd"
	/>
</svg>
