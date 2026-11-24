<script lang="ts">
	import { Currency } from '$lib/enums/currency';

	interface Props {
		currency: Currency;
		size?: number;
	}

	let { currency, size = 24 }: Props = $props();

	// Five-pointed star as polygon points, for the flags that carry one.
	const star = (cx: number, cy: number, r: number, turn = 0): string =>
		Array.from({ length: 10 }, (_, i) => {
			const radius = i % 2 === 0 ? r : r * 0.4;
			const angle = -Math.PI / 2 + (i * Math.PI) / 5 + turn;
			return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
		}).join(' ');

	const usStripes = Array.from({ length: 7 }, (_, i) => i * (32 / 6.5));
	const euStars = Array.from({ length: 12 }, (_, i) => {
		const angle = (i * Math.PI) / 6;
		return { x: 16 + 9 * Math.cos(angle), y: 16 + 9 * Math.sin(angle) };
	});
</script>

<!-- Simplified flags drawn for a round chip a few pixels wide, not to heraldic precision. -->
<svg
	class="shrink-0 rounded-full outline-1 -outline-offset-1 outline-black/15"
	aria-hidden="true"
	height={size}
	viewBox="0 0 32 32"
	width={size}
>
	{#if currency === Currency.USD}
		<rect fill="#fff" height="32" width="32" />
		{#each usStripes as y (y)}
			<rect fill="#b22234" height="2.46" width="32" {y} />
		{/each}
		<rect fill="#3c3b6e" height="17.2" width="15" />
		{#each [3, 7.5, 12] as x (x)}
			{#each [3.5, 8.5, 13.5] as y (y)}
				<circle cx={x} cy={y} fill="#fff" r="1.1" />
			{/each}
		{/each}
	{:else if currency === Currency.EUR}
		<rect fill="#039" height="32" width="32" />
		{#each euStars as { x, y } (`${x}-${y}`)}
			<circle cx={x} cy={y} fill="#fc0" r="1.3" />
		{/each}
	{:else if currency === Currency.CHF}
		<rect fill="#da291c" height="32" width="32" />
		<rect fill="#fff" height="18" width="6" x="13" y="7" />
		<rect fill="#fff" height="6" width="18" x="7" y="13" />
	{:else if currency === Currency.GBP}
		<rect fill="#012169" height="32" width="32" />
		<path d="M0 0L32 32M32 0L0 32" stroke="#fff" stroke-width="6" />
		<path d="M0 0L32 32M32 0L0 32" stroke="#c8102e" stroke-width="2" />
		<path d="M16 0V32M0 16H32" stroke="#fff" stroke-width="10" />
		<path d="M16 0V32M0 16H32" stroke="#c8102e" stroke-width="6" />
	{:else if currency === Currency.JPY}
		<rect fill="#fff" height="32" width="32" />
		<circle cx="16" cy="16" fill="#bc002d" r="9" />
	{:else if currency === Currency.CAD}
		<rect fill="#fff" height="32" width="32" />
		<rect fill="#d52b1e" height="32" width="8" />
		<rect fill="#d52b1e" height="32" width="8" x="24" />
		<path
			d="M16 8l1.6 3 2-1-.6 4.4 2.6-2 .8 1.6 2-.4-1 3.2 1 .6-4.4 3 .4 1.6-3.6-.6V24h-1.6v-2.6l-3.6.6.4-1.6-4.4-3 1-.6-1-3.2 2 .4.8-1.6 2.6 2-.6-4.4 2 1z"
			fill="#d52b1e"
		/>
	{:else if currency === Currency.SGD}
		<rect fill="#fff" height="32" width="32" />
		<rect fill="#ee2536" height="16" width="32" />
		<circle cx="9" cy="8" fill="#fff" r="5" />
		<circle cx="11" cy="8" fill="#ee2536" r="5" />
		{#each [[13, 4.5], [16.5, 7], [15, 11], [11, 11], [9.8, 7]] as [x, y] (`${x}-${y}`)}
			<polygon fill="#fff" points={star(x, y, 1.3)} />
		{/each}
	{:else if currency === Currency.INR}
		<rect fill="#fff" height="32" width="32" />
		<rect fill="#f93" height="10.67" width="32" />
		<rect fill="#138808" height="10.67" width="32" y="21.33" />
		<circle cx="16" cy="16" fill="none" r="3.6" stroke="#000080" stroke-width="1" />
		<circle cx="16" cy="16" fill="#000080" r="0.9" />
	{:else if currency === Currency.BRL}
		<rect fill="#009c3b" height="32" width="32" />
		<polygon fill="#ffdf00" points="16,5 29,16 16,27 3,16" />
		<circle cx="16" cy="16" fill="#002776" r="6.5" />
		<path d="M9.8 14.6c4-1.2 8.4-.6 12.3 1.8" fill="none" stroke="#fff" stroke-width="1.2" />
	{:else if currency === Currency.KRW}
		<rect fill="#fff" height="32" width="32" />
		<path d="M9 16a7 7 0 0 1 14 0a3.5 3.5 0 0 1-7 0a3.5 3.5 0 0 0-7 0z" fill="#cd2e3a" />
		<path d="M23 16a7 7 0 0 1-14 0a3.5 3.5 0 0 0 7 0a3.5 3.5 0 0 1 7 0z" fill="#0047a0" />
		{#each [[6, 6, 45], [26, 6, -45], [6, 26, -45], [26, 26, 45]] as [x, y, r] (`${x}-${y}`)}
			<g fill="#000" transform="translate({x} {y}) rotate({r})">
				<rect height="0.9" width="5" x="-2.5" y="-2" />
				<rect height="0.9" width="5" x="-2.5" y="-0.45" />
				<rect height="0.9" width="5" x="-2.5" y="1.1" />
			</g>
		{/each}
	{:else if currency === Currency.AED}
		<rect fill="#fff" height="32" width="32" />
		<rect fill="#00732f" height="10.67" width="32" />
		<rect fill="#000" height="10.67" width="32" y="21.33" />
		<rect fill="#ff0000" height="32" width="9" />
	{:else if currency === Currency.PLN}
		<rect fill="#fff" height="16" width="32" />
		<rect fill="#dc143c" height="16" width="32" y="16" />
	{:else if currency === Currency.CZK}
		<rect fill="#fff" height="16" width="32" />
		<rect fill="#d7141a" height="16" width="32" y="16" />
		<polygon fill="#11457e" points="0,0 16,16 0,32" />
	{:else if currency === Currency.VND}
		<rect fill="#da251d" height="32" width="32" />
		<polygon fill="#ff0" points={star(16, 16.5, 8)} />
	{:else if currency === Currency.CNY}
		<rect fill="#ee1c25" height="32" width="32" />
		<polygon fill="#ff0" points={star(9, 10, 5)} />
		{#each [[16, 5], [19, 8.5], [19, 13], [16, 16.5]] as [x, y] (`${x}-${y}`)}
			<polygon fill="#ff0" points={star(x, y, 1.4)} />
		{/each}
	{:else if currency === Currency.NGN}
		<rect fill="#fff" height="32" width="32" />
		<rect fill="#008751" height="32" width="10.67" />
		<rect fill="#008751" height="32" width="10.67" x="21.33" />
	{:else if currency === Currency.SAR}
		<rect fill="#006c35" height="32" width="32" />
		<path d="M8 13.5h16M10 16h12" stroke="#fff" stroke-linecap="round" stroke-width="1.4" />
		<path d="M9 20.5h14" stroke="#fff" stroke-linecap="round" stroke-width="1" />
	{:else if currency === Currency.RUB}
		<rect fill="#fff" height="10.67" width="32" />
		<rect fill="#0039a6" height="10.67" width="32" y="10.67" />
		<rect fill="#d52b1e" height="10.67" width="32" y="21.33" />
	{/if}
</svg>
