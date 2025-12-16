<script lang="ts">
	interface Props {
		src: string;
		ariaLabel?: string;
		role?: string;
		width?: string;
		height?: string;
		rounded?: boolean;
		fitHeight?: boolean;
		grayscale?: boolean;
		styleClass?: string;
		testId?: string;
		onLoad?: () => void;
		onError?: () => void;
	}

	let {
		src,
		ariaLabel = '',
		role = 'presentation',
		width,
		height,
		rounded = false,
		fitHeight = false,
		grayscale = false,
		styleClass,
		testId,
		onLoad,
		onError
	}: Props = $props();
</script>

<video
	style={fitHeight ? `max-width: inherit; height: ${height};` : undefined}
	class={styleClass}
	class:grayscale
	class:rounded-full={rounded}
	aria-label={ariaLabel}
	autoplay
	playsinline
	data-tid={testId}
	{height}
	loop
	muted
	onerror={onError}
	onload={onLoad}
	{role}
	{width}
>
	<source {src} />
</video>
