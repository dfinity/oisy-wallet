<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
		text: string;
	}

	let { size = '46', text }: Props = $props();

	const generateColor = (text: string): string => {
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			hash = text.charCodeAt(i) + ((hash << 5) - hash);
		}

		const color = (hash & 0x00ffffff).toString(16).toUpperCase();

		return `#${'00000'.substring(0, 6 - color.length)}${color}`;
	};

	const randomColor = $derived(generateColor(text));
</script>

<svg height={size} width={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
	<circle cx="16" cy="16" r="16" fill={randomColor} />
</svg>
