<script lang="ts">
	interface Snowflake {
		left: string;
		opacity: string;
		duration: string;
		delay: string;
		symbol: string;
	}

	const snowflakes: Snowflake[] = Array.from({ length: 50 }, () => ({
		left: `${Math.random() * 100}%`,
		opacity: `${Math.random()}`,
		duration: `${Math.random() * 7 + 3}s`,
		delay: `${Math.random() * 2}s`,
		symbol: Math.random() > 0.5 ? '❅' : '❄️'
	}));
</script>

<div class="pointer-events-none fixed inset-0 z-10 flex size-full">
	{#each snowflakes as { left, opacity, duration, delay, symbol }}
		<div
			class="absolute size-2 animate-snowfall rounded-full text-white"
			style="left: {left}; opacity: {opacity}; animation-duration: {duration}; animation-delay: -{delay};"
		>
			{symbol}
		</div>
	{/each}
</div>
