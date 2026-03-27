<!-- source: ISC Lucide - please visit https://lucide.dev/license -->
<script lang="ts">
	interface Props {
		styleClass?: string;
		size?: string;
	}

	let { styleClass, size = '20' }: Props = $props();
</script>

<svg
	class={styleClass}
	fill="none"
	height={size}
	viewBox="0 0 20 20"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<g clip-path="url(#clip0_18064_20202)">
		<path
			clip-rule="evenodd"
			d="M18.9223 1.0776C19.1486 1.30396 19.2253 1.63999 19.1196 1.94214L13.2862 18.6088C13.1734 18.9313 12.875 19.1522 12.5336 19.1662C12.1922 19.1801 11.8769 18.9842 11.7382 18.672L8.53501 11.4649L1.3279 8.2617C1.01566 8.12293 0.819777 7.80762 0.833705 7.46622C0.847633 7.12482 1.06855 6.82651 1.39105 6.71364L18.0577 0.880304C18.3599 0.774549 18.6959 0.851232 18.9223 1.0776ZM3.92557 7.59236L9.50479 10.072C9.69332 10.1558 9.84407 10.3065 9.92786 10.4951L12.4075 16.0743L16.9747 3.02516L3.92557 7.59236Z"
			fill="currentColor"
			fill-rule="evenodd"
		/>
		<path
			clip-rule="evenodd"
			d="M18.9223 1.07757C19.2477 1.40301 19.2477 1.93065 18.9223 2.25609L9.7556 11.4228C9.43016 11.7482 8.90252 11.7482 8.57709 11.4228C8.25165 11.0973 8.25165 10.5697 8.57709 10.2442L17.7438 1.07757C18.0692 0.752137 18.5968 0.752137 18.9223 1.07757Z"
			fill="currentColor"
			fill-rule="evenodd"
		/>
	</g>
	<defs>
		<clipPath id="clip0_18064_20202">
			<rect fill="white" height="20" width="20" />
		</clipPath>
	</defs>
</svg>
