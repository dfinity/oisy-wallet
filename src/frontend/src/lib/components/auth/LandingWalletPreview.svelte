<!-- Ship the scoped styles in the lazy module so the app shell cannot link them eagerly. -->
<svelte:options css="injected" />

<script lang="ts">
	import { quadOut } from 'svelte/easing';
	import bitcoin from '$btc/assets/bitcoin.svg?inline';
	import usdCoin from '$eth/assets/usdc.svg?inline';
	import internetComputer from '$icp/assets/icp-light.svg?inline';
	import ether from '$icp-eth/assets/eth.svg?inline';
	import allNetworks from '$lib/assets/networks/all-networks.svg?inline';
	import arbitrumNetwork from '$lib/assets/networks/arbitrum-mainnet.svg?inline';
	import baseNetwork from '$lib/assets/networks/base-mainnet.svg?inline';
	import bitcoinNetwork from '$lib/assets/networks/bitcoin-mainnet.svg?inline';
	import bnbNetwork from '$lib/assets/networks/bsc-mainnet.svg?inline';
	import ethereumNetwork from '$lib/assets/networks/ethereum-mainnet.svg?inline';
	import icpNetwork from '$lib/assets/networks/icp.svg?inline';
	import polygonNetwork from '$lib/assets/networks/polygon-mainnet.svg?inline';
	import robinhoodNetwork from '$lib/assets/networks/robinhood-mainnet.svg?inline';
	import solanaNetwork from '$lib/assets/networks/solana-mainnet.svg?inline';
	import xrpNetwork from '$lib/assets/networks/xrp-mainnet.svg?inline';
	import oisyWordmark from '$lib/assets/oisy-logo-large.svg?inline';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconCkConvert from '$lib/components/icons/IconCkConvert.svelte';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import IconReceive from '$lib/components/icons/IconReceive.svelte';
	import IconScanLine from '$lib/components/icons/IconScanLine.svelte';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import IconUser from '$lib/components/icons/IconUser.svelte';
	import IconAstronautHelmet from '$lib/components/icons/icon-astronaut/IconAstronautHelmet.svelte';
	import IconlyBuy from '$lib/components/icons/iconly/IconlyBuy.svelte';
	import IconlySend from '$lib/components/icons/iconly/IconlySend.svelte';
	import IconBellDot from '$lib/components/icons/lucide/IconBellDot.svelte';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconEllipsis from '$lib/components/icons/lucide/IconEllipsis.svelte';
	import IconLayers from '$lib/components/icons/lucide/IconLayers.svelte';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import IconNotebook from '$lib/components/icons/lucide/IconNotebook.svelte';
	import IconSearch from '$lib/components/icons/lucide/IconSearch.svelte';
	import IconWallet from '$lib/components/icons/lucide/IconWallet.svelte';
	import { Languages } from '$lib/enums/languages';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import solana from '$sol/assets/sol.svg?inline';

	const id = $props.id();
	const desktopScreen = `${id}-desktop`;
	const phoneScreen = `${id}-phone`;
	const portfolioGradient = `${id}-portfolio`;
	const bitcoinGradient = `${id}-bitcoin`;

	interface Rectangle {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	const frameStrokeWidth = 2;

	const roundedScreenPath = ({
		x,
		y,
		width,
		height,
		radius
	}: Rectangle & { radius: number }): string => {
		const right = x + width;
		const bottom = y + height;
		const near = radius / 5;
		const far = (radius * 4) / 5;
		const startControl = (radius * 3) / 10;
		const tangentControl = (radius * 3) / 5;
		const endControl = radius / 2;

		// Each pair of curves meets on the diagonal and flattens into the straight edges.
		return [
			`M ${x + radius} ${y} H ${right - radius}`,
			`c ${startControl} 0 ${tangentControl} 0 ${far} ${near} s ${near} ${endControl} ${near} ${far}`,
			`V ${bottom - radius}`,
			`c 0 ${startControl} 0 ${tangentControl} ${-near} ${far} s ${-endControl} ${near} ${-far} ${near}`,
			`H ${x + radius}`,
			`c ${-startControl} 0 ${-tangentControl} 0 ${-far} ${-near} s ${-near} ${-endControl} ${-near} ${-far}`,
			`V ${y + radius}`,
			`c 0 ${-startControl} 0 ${-tangentControl} ${near} ${-far} s ${endControl} ${-near} ${far} ${-near} Z`
		].join(' ');
	};

	const devicePaths = ({
		x,
		y,
		width,
		height,
		innerRadius,
		padding
	}: Rectangle & { innerRadius: number; padding: number }) => {
		// SVG centers the stroke on the outline, so half of it sits inside the bezel.
		const inset = padding + frameStrokeWidth / 2;

		return {
			frame: roundedScreenPath({ x, y, width, height, radius: innerRadius + inset }),
			screen: roundedScreenPath({
				x: x + inset,
				y: y + inset,
				width: width - 2 * inset,
				height: height - 2 * inset,
				radius: innerRadius
			})
		};
	};

	const desktopPaths = devicePaths({
		x: 59,
		y: 9,
		width: 1006,
		height: 670,
		innerRadius: 24,
		padding: 17
	});
	const phonePaths = devicePaths({
		x: 17,
		y: 181,
		width: 272,
		height: 565,
		innerRadius: 36,
		padding: 9
	});

	// Illustrative balances keep the signed-out preview independent of wallet data.
	const bitcoinBalance = 5249.84;
	const tokenDuration = 170;
	const currency = $derived(
		new Intl.NumberFormat($i18n.lang, { style: 'currency', currency: 'USD' })
	);
	const transactionDate = $derived(
		new Intl.DateTimeFormat($i18n.lang, {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		})
	);
	const transactionTime = $derived(
		new Intl.DateTimeFormat($i18n.lang, {
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
			timeZone: 'UTC'
		})
	);
	const phoneTransactions = [
		{
			direction: 'send',
			address: 'bc1qwm5...93rtylq',
			amount: '-0.05 BTC',
			timestamp: Date.UTC(2025, 1, 27, 15, 32)
		},
		{
			direction: 'receive',
			address: 'bc1qc6g...kjh5n9z',
			amount: '+0.01 BTC',
			timestamp: Date.UTC(2025, 0, 15, 13, 27)
		},
		{
			direction: 'send',
			address: 'bc1qc6g...kjh5n9z',
			amount: '-0.02 BTC',
			timestamp: Date.UTC(2024, 10, 21, 14, 18)
		}
	] as const;

	const tokens = [
		{
			symbol: 'BTC',
			name: 'Bitcoin',
			icon: bitcoin,
			price: 84132,
			balance: '0.0624',
			value: bitcoinBalance,
			revealAt: 140
		},
		{
			symbol: 'ICP',
			name: 'Internet Computer',
			icon: internetComputer,
			price: 3.32,
			balance: '3,526.6205',
			value: 11708.38,
			revealAt: 300
		},
		{
			symbol: 'ETH',
			name: 'Ethereum',
			icon: ether,
			price: 2734.25,
			balance: '1.8245',
			value: 4988.57,
			revealAt: 460
		},
		{
			symbol: 'USDC',
			name: 'USD Coin',
			icon: usdCoin,
			price: 1,
			balance: '3,878.76',
			value: 3878.76,
			revealAt: 565
		},
		{
			symbol: 'SOL',
			name: 'Solana',
			icon: solana,
			price: 120.05,
			balance: '21.4960',
			value: 2580.6,
			revealAt: 620
		}
	];

	const portfolioBalance =
		tokens.reduce((cents, { value }) => cents + Math.round(value * 100), 0) / 100;
	const balanceStart = tokens[0].revealAt;
	const tokenRowsEnd = tokens[tokens.length - 1].revealAt + tokenDuration;
	const balanceDuration = tokenRowsEnd - balanceStart;
	// Give the final animation frame time to paint before the menu opens.
	const networkMenuDelay = tokenRowsEnd + 32;
	const balanceCenter = 558;
	let countingBalance = $state<number>();
	let balanceRight = $state<number>();

	const countPortfolioBalance = (reference: SVGTextElement) => {
		const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
		const { fonts } = reference.ownerDocument;

		if (!motion.matches || !fonts) {
			return;
		}

		const startsAt = performance.now() + balanceStart;
		let frame = 0;
		let active = true;

		const finish = () => {
			active = false;
			cancelAnimationFrame(frame);
			motion.removeEventListener('change', finish);
			countingBalance = undefined;
		};

		const update = (now: number) => {
			const progress = Math.max(0, (now - startsAt) / balanceDuration);

			if (progress >= 1) {
				finish();
				return;
			}

			countingBalance = Math.floor(portfolioBalance * quadOut(progress));
			frame = requestAnimationFrame(update);
		};

		motion.addEventListener('change', finish);
		void fonts.ready.then(() => {
			if (!active) {
				return;
			}

			// Reserve the final amount's right edge once, so new digits grow leftward.
			balanceRight = balanceCenter + reference.getComputedTextLength() / 2;
			frame = requestAnimationFrame(update);
		});

		return finish;
	};

	const networks = [
		{ name: 'Bitcoin', icon: bitcoinNetwork, value: bitcoinBalance },
		{ name: 'Ethereum', icon: ethereumNetwork, value: 4988.57 },
		{ name: 'Internet Computer', icon: icpNetwork, value: 11708.38 },
		{ name: 'Arbitrum', icon: arbitrumNetwork, value: 1270.28 },
		{ name: 'Base', icon: baseNetwork, value: 1283.56 },
		{ name: 'BNB Smart Chain', icon: bnbNetwork, value: 387.39 },
		{ name: 'Polygon', icon: polygonNetwork, value: 186.01 },
		{ name: 'Robinhood Chain', icon: robinhoodNetwork, value: 185.64 },
		{ name: 'Solana', icon: solanaNetwork, value: 2580.6 },
		{ name: 'XRP Ledger', icon: xrpNetwork, value: 565.88 }
	];

	const primaryActions = $derived([
		{ label: $i18n.receive.text.receive, Icon: IconQr },
		{ label: $i18n.send.text.send, Icon: IconlySend },
		{ label: $i18n.swap.text.swap, Icon: IconCkConvert }
	]);

	const desktopActions = $derived([
		...primaryActions,
		{ label: $i18n.buy.text.buy_sell, Icon: IconlyBuy }
	]);
	const phoneActions = $derived([...primaryActions, { label: 'ckBTC', Icon: IconCkConvert }]);

	const headerIcons = [IconBellDot, IconScanLine, IconUser];
	const phoneTabs = $derived([
		{ label: $i18n.navigation.text.tokens, Icon: IconWallet },
		{ label: $i18n.navigation.text.activity, Icon: IconClock },
		{ label: $i18n.navigation.text.section_finance, Icon: IconLayers },
		{ label: $i18n.navigation.text.notes, Icon: IconNotebook },
		{ label: $i18n.core.text.more, Icon: IconEllipsis }
	]);

	const networkTriggerWidth = $derived($i18n.lang === Languages.ENGLISH ? 125 : 161);
	const networkTriggerX = $derived(913 - networkTriggerWidth);

	const fitLocalizedLabels = (preview: SVGSVGElement) => {
		if ($i18n.lang === Languages.ENGLISH) {
			return;
		}

		let active = true;
		let fitted: SVGTextElement[] = [];
		// Measure after the app fonts load. Keep layout reads together before changing any labels.
		void preview.ownerDocument.fonts?.ready.then(() => {
			if (!active) {
				return;
			}

			const labels = Array.from(
				preview.querySelectorAll<SVGTextElement>('svg[overflow="hidden"] > text')
			);
			const overflowing = labels.flatMap((label) => {
				const width = (label.ownerSVGElement?.width.baseVal.value ?? 0) - 2;
				return width > 0 && label.getComputedTextLength() > width ? [{ label, width }] : [];
			});
			fitted = overflowing.map(({ label, width }) => {
				label.setAttribute('textLength', `${width}`);
				label.setAttribute('lengthAdjust', 'spacingAndGlyphs');
				return label;
			});
		});

		return () => {
			active = false;
			for (const label of fitted) {
				label.removeAttribute('textLength');
				label.removeAttribute('lengthAdjust');
			}
		};
	};
</script>

{#snippet headerControls(x: number, y: number)}
	<g class="accent" transform="translate({x} {y})">
		{#each headerIcons as Icon, index (Icon)}
			<g transform="translate({index * 35} 0)">
				<rect fill="var(--color-background-primary)" height="27" rx="9" width="27" />
				<g transform="translate(5.5 5.5)"><Icon size="16" /></g>
			</g>
		{/each}
	</g>
{/snippet}

{#snippet balanceActions(actions: typeof desktopActions, width: number)}
	{#each actions as { label, Icon }, index (label)}
		<g class="balance-action" transform="translate({index * (width + 5)} 0)">
			<rect height="38" rx="11" {width} />
			<g transform="translate({width / 2 - 8} 4)"><Icon size="16" /></g>
			<svg height="38" overflow="hidden" width={width - 4} x="2">
				<text font-size="9" font-weight="700" text-anchor="middle" x={(width - 4) / 2} y="30">
					{label}
				</text>
			</svg>
		</g>
	{/each}
{/snippet}

{#snippet networkRow(y: number, name: string, icon: string, value: number)}
	<image class="invert-on-dark-theme" height="17" href={icon} width="17" x="24" y={y + 7} />
	<svg height="33" overflow="hidden" width="96" x="51" {y}>
		<text font-size="11" y="19">{name}</text>
	</svg>
	<text class="muted" font-size="9" text-anchor="end" x="205" y={y + 19}
		>{currency.format(value)}</text
	>
{/snippet}

{#snippet transaction(y: number, row: (typeof phoneTransactions)[number])}
	{@const incoming = row.direction === 'receive'}
	{@const DirectionIcon = incoming ? IconReceive : IconSend}
	<image height="27" href={bitcoin} width="27" x="39" {y} />
	<g transform="translate(62 {y + 22})">
		<circle
			fill="var(--color-background-primary)"
			r="7"
			stroke="var(--color-border-brand-subtle-20)"
		/>
		<g transform="translate(-5 -5)"><DirectionIcon size="10" /></g>
	</g>
	<svg height="28" overflow="hidden" width="130" x="76" {y}>
		<text font-size="11" font-weight="700" y="10">
			{incoming ? $i18n.receive.text.receive : $i18n.send.text.send}<tspan dx="4">₿</tspan>
		</text>
		<text font-size="10" y="24">
			{incoming ? $i18n.transaction.text.from : $i18n.transaction.text.to}
			{row.address}
		</text>
	</svg>
	<text class:incoming font-size="10" font-weight="700" text-anchor="end" x="267" y={y + 10}
		>{row.amount}</text
	>
	<text class="muted" font-size="8" text-anchor="end" x="267" y={y + 24}
		>{transactionTime.format(row.timestamp)}</text
	>
{/snippet}

<svg
	style:--frame-stroke-width={frameStrokeWidth}
	style:--network-menu-delay={`${networkMenuDelay}ms`}
	style:--token-duration={`${tokenDuration}ms`}
	class="preview block h-auto w-full decorative-motion"
	{@attach fitLocalizedLabels}
	aria-label={replaceOisyPlaceholders($i18n.auth.alt.preview)}
	height="1504"
	role="img"
	viewBox="0 0 1080 752"
	width="2160"
>
	<defs>
		<clipPath id={desktopScreen}><path d={desktopPaths.screen} /></clipPath>
		<clipPath id={phoneScreen}><path d={phonePaths.screen} /></clipPath>
		<linearGradient id={portfolioGradient} x2="0" y2="1">
			<stop class="gradient-start from-default-0" />
			<stop class="gradient-end to-default-100" offset="1" />
		</linearGradient>
		<linearGradient id={bitcoinGradient} x2="0" y2="1">
			<stop class="gradient-start from-btc-0" />
			<stop class="gradient-end to-btc-100" offset="1" />
		</linearGradient>
	</defs>

	<!-- Desktop wallet. The card, tabs and menu mirror HeroContent and NetworksSwitcher. -->
	<path class="frame" d={desktopPaths.frame} />
	<path class="screen" d={desktopPaths.screen} />
	<g aria-hidden="true" clip-path="url(#{desktopScreen})">
		<rect class="chrome" height="49" width="970" x="77" y="27" />
		<circle cx="89" cy="40" fill="var(--color-foreground-error-primary)" r="3.5" />
		<circle cx="101" cy="40" fill="var(--color-foreground-warning-primary)" r="3.5" />
		<circle cx="113" cy="40" fill="var(--color-foreground-success-primary)" r="3.5" />
		<rect class="toolbar" height="23" rx="6" width="83" x="125" y="32" />
		<g transform="translate(131 36) scale(.23)"><IconAstronautHelmet /></g>
		<text font-size="9" x="146" y="44">OISY Wallet</text>
		<rect class="toolbar" height="23" width="970" x="77" y="53" />
		<rect class="chrome" height="15" rx="7.5" width="870" x="155" y="57" />
		<text class="muted" font-size="9" x="166" y="67">oisy.com</text>

		<g transform="translate(98 92) scale(.68)"><IconAstronautHelmet /></g>
		<image class="invert-on-dark-theme" height="26" href={oisyWordmark} width="68" x="134" y="95" />
		<text class="muted" font-size="9" font-weight="700" x="106" y="160"
			>{$i18n.navigation.text.section_portfolio}</text
		>
		<rect
			fill="var(--color-background-brand-subtle-10)"
			height="28"
			rx="8"
			width="216"
			x="98"
			y="170"
		/>
		<g class="accent" transform="translate(108 176)"><IconWallet size="16" /></g>
		<text class="accent" font-size="12" x="134" y="188">{$i18n.navigation.text.tokens}</text>
		<g class="muted" transform="translate(108 211)"><IconClock size="16" /></g>
		<text class="muted" font-size="12" x="134" y="223">{$i18n.navigation.text.activity}</text>

		<g class="desktop-entrance">
			<rect fill="url(#{portfolioGradient})" height="166" rx="19" width="388" x="364" y="92" />
			<g class="portfolio-balance on-gradient" font-size="32" font-weight="700">
				<text
					{@attach countPortfolioBalance}
					text-anchor="middle"
					visibility={countingBalance === undefined ? 'visible' : 'hidden'}
					x={balanceCenter}
					y="153">{currency.format(portfolioBalance)}</text
				>
				{#if countingBalance !== undefined && balanceRight !== undefined}
					<text text-anchor="end" x={balanceRight} y="153">{currency.format(countingBalance)}</text>
				{/if}
			</g>
			<text class="on-gradient" font-size="14" text-anchor="middle" x="558" y="176"
				>{$i18n.hero.text.available_balance}</text
			>
			<g transform="translate(378 205)">{@render balanceActions(desktopActions, 86)}</g>
		</g>

		<svg height="22" overflow="hidden" width="303" x="366" y="275">
			<text font-size="12" font-weight="700" y="16">
				<tspan>{$i18n.tokens.text.title_short}</tspan>
				<tspan class="muted" dx="9">{$i18n.trading.text.tab_title}</tspan>
				<tspan class="muted" dx="9">{$i18n.earning.text.tab_title}</tspan>
				<tspan class="muted" dx="9">{$i18n.borrowings.text.tab_title}</tspan>
			</text>
		</svg>
		<path d="M366 296h34" stroke="var(--color-background-brand-primary)" stroke-width="2" />
		<g class="muted" transform="translate(672 280)"><IconSearch size="14" /></g>
		{#each [{ label: $i18n.tokens.text.asset_type_all, x: 364, width: 74 }, { label: $i18n.token_tag.category.crypto, x: 444, width: 50 }, { label: $i18n.token_tag.category.stablecoin, x: 500, width: 70 }, { label: $i18n.token_tag.category.stock, x: 576, width: 53 }, { label: $i18n.token_tag.category.commodity, x: 635, width: 75 }] as { label, x, width }, index (x)}
			<rect class="chip" class:active-chip={index === 0} height="18" rx="9" {width} {x} y="312" />
			<svg height="18" overflow="hidden" width={width - 4} x={x + 2} y="312">
				<text
					class:active-chip-label={index === 0}
					font-size="9"
					text-anchor="middle"
					x={(width - 4) / 2}
					y="12">{label}</text
				>
			</svg>
		{/each}
		{#each tokens as { symbol, name, icon, price, balance, value, revealAt }, index (symbol)}
			<g transform="translate(369 {350 + index * 59})">
				<g style:--token-delay={`${revealAt}ms`} class="token-row">
					<image height="37" href={icon} width="37" />
					<text font-size="14" font-weight="700" x="46" y="16">{symbol}</text>
					<text class="muted" font-size="10" x="89" y="16">{currency.format(price)}</text>
					<text class="muted" font-size="11" x="46" y="33">{name}</text>
					<text font-size="13" font-weight="700" text-anchor="end" x="379" y="16">{balance}</text>
					<text class="muted" font-size="10" text-anchor="end" x="379" y="33"
						>{currency.format(value)}</text
					>
				</g>
			</g>
		{/each}

		<g class="desktop-entrance">
			<rect
				class="network-trigger-fill"
				height="27"
				rx="9"
				width={networkTriggerWidth}
				x={networkTriggerX}
				y="93"
			/>
			<image
				class="invert-on-dark-theme"
				height="17"
				href={allNetworks}
				width="17"
				x={networkTriggerX + 10}
				y="98"
			/>
			<svg
				height="27"
				overflow="hidden"
				width={networkTriggerWidth - 59}
				x={networkTriggerX + 32}
				y="93"
			>
				<text font-size="11" y="17">{$i18n.networks.chain_fusion}</text>
			</svg>
			<g transform="translate(889 100)">
				<g class="network-chevron"><IconExpandMore size="13" /></g>
			</g>
			{@render headerControls(921, 93)}
		</g>

		<g transform="translate(700 123)">
			<g class="network-menu">
				<rect class="panel" height="453" rx="13" width="220" />
				<g class="accent" transform="translate(12 21)"><IconCheck size="12" /></g>
				{@render networkRow(12, $i18n.networks.chain_fusion, allNetworks, portfolioBalance)}
				{#each networks as { name, icon, value }, index (name)}
					{@const y = 47 + index * 36}
					<path class="divider" d="M16 {y}h188" />
					{@render networkRow(y + 1, name, icon, value)}
				{/each}
				<g class="accent" transform="translate(16 417)"><IconManage size="15" /></g>
				<text class="accent" font-size="11" font-weight="700" x="38" y="429"
					>{$i18n.networks.manage}</text
				>
			</g>
		</g>
	</g>

	<!-- Mobile Bitcoin detail. This uses the same visual hierarchy as HeroContent and Transactions. -->
	<g class="phone" aria-hidden="true">
		<path class="frame" d={phonePaths.frame} />
		<path class="screen" d={phonePaths.screen} />
		<g clip-path="url(#{phoneScreen})">
			<rect class="bezel" height="22" rx="11" width="74" x="116" y="194" />
			<text font-size="11" font-weight="700" x="49" y="211">1:47</text>
			<rect fill="none" height="7" rx="2" stroke="currentColor" width="16" x="244" y="201" />
			<rect fill="currentColor" height="3" rx="1" width="12" x="246" y="203" />
			<path d="M263 203v3M231 207v-2m4 2v-4m4 4v-6" stroke="currentColor" stroke-linecap="round" />

			<g transform="translate(37 236) scale(.66)"><IconAstronautHelmet /></g>
			{@render headerControls(175, 237)}

			<rect fill="url(#{bitcoinGradient})" height="159" rx="15" width="236" x="35" y="280" />
			<image height="25" href={bitcoin} width="25" x="50" y="290" />
			<text class="on-gradient" font-size="10" font-weight="700" x="80" y="301">Bitcoin</text>
			<text class="on-gradient" font-size="9" x="80" y="313">BTC</text>
			<text class="on-gradient" font-size="10" text-anchor="end" x="255" y="304"
				>{currency.format(84132)}</text
			>
			<text
				class="on-gradient"
				font-size="24"
				font-weight="700"
				text-anchor="middle"
				x="153"
				y="353">0.0624 BTC</text
			>
			<text class="on-gradient" font-size="13" text-anchor="middle" x="153" y="375"
				>{currency.format(bitcoinBalance)}</text
			>
			<g transform="translate(43 394)">{@render balanceActions(phoneActions, 51)}</g>

			<text font-size="12" font-weight="700" x="35" y="468">{$i18n.transactions.text.title}</text>
			{#each phoneTransactions as row, index (row.timestamp)}
				{@const y = 489 + index * 68}
				<text class="muted" font-size="12" x="37" {y}>{transactionDate.format(row.timestamp)}</text>
				{@render transaction(y + 11, row)}
			{/each}

			<rect class="panel" height="67" width="252" x="27" y="678" />
			{#each phoneTabs as { label, Icon }, index (label)}
				<g class:accent={index === 0} transform="translate({52 + index * 50} 689)">
					<g class="phone-tab-icon" transform="translate(-8 0)"><Icon /></g>
					<svg height="30" overflow="hidden" width="48" x="-24">
						<text font-size="9" text-anchor="middle" x="24" y="28">{label}</text>
					</svg>
				</g>
			{/each}
			<rect fill="currentColor" height="4" rx="2" width="90" x="108" y="727" />
		</g>
	</g>
</svg>

<style lang="scss">
	@use '../../styles/theme/base-colors' as palette;

	.preview {
		color: var(--color-foreground-primary);
		fill: currentColor;
		pointer-events: none;
		user-select: none;
	}

	.frame {
		fill: palette.$dusk-950;
		stroke: palette.$dusk-400;
		stroke-width: var(--frame-stroke-width);
	}

	.bezel {
		fill: palette.$dusk-950;
	}

	.screen {
		fill: var(--color-background-page);
	}

	.chrome {
		fill: var(--color-background-tertiary);
	}

	.toolbar,
	.panel,
	.chip {
		fill: var(--color-background-primary);
	}

	.panel,
	.chip,
	.divider {
		stroke: var(--color-border-primary);
	}

	.muted {
		fill: var(--color-foreground-tertiary);
		color: var(--color-foreground-tertiary);
	}

	.incoming {
		fill: var(--color-foreground-success-primary);
	}

	.accent,
	.balance-action {
		color: var(--color-foreground-brand-hover);
		fill: currentColor;
	}

	.active-chip {
		fill: var(--color-background-brand-primary);
	}

	.active-chip-label,
	.on-gradient {
		fill: var(--color-foreground-primary-inverted);
	}

	.balance-action rect {
		fill: var(--color-background-primary-alt);
	}

	.phone-tab-icon :global(svg) {
		width: 16px;
		height: 16px;
	}

	:global([theme='dark']) .balance-action {
		color: var(--color-foreground-primary-inverted);
	}

	.gradient-start {
		stop-color: var(--tw-gradient-from);
	}

	.gradient-end {
		stop-color: var(--tw-gradient-to);
	}

	.network-trigger-fill {
		fill: var(--color-background-brand-subtle-10);
	}

	.network-menu > .panel {
		stroke: var(--color-border-brand-subtle-20);
	}

	:global([theme='dark']) .network-menu > .panel {
		fill: var(--color-background-secondary);
		stroke: var(--color-border-secondary-inverted);
	}

	.network-chevron {
		color: var(--color-foreground-tertiary);
		rotate: 180deg;
		transform-box: fill-box;
		transform-origin: center;

		:global(path) {
			stroke-width: 2.5;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.desktop-entrance {
			animation: reveal-wallet-detail 220ms ease-out backwards;
		}

		.phone {
			transform-box: fill-box;
			transform-origin: bottom center;
			animation: settle-phone 400ms cubic-bezier(0.23, 1, 0.32, 1) 60ms backwards;
		}

		.token-row {
			animation: reveal-wallet-detail var(--token-duration) ease-out var(--token-delay) backwards;
		}

		.network-trigger-fill {
			animation: open-network-trigger 150ms ease-out var(--network-menu-delay) backwards;
		}

		.network-chevron {
			animation: turn-network-chevron 200ms cubic-bezier(0.2, 0, 0, 1) var(--network-menu-delay)
				backwards;
		}

		.network-menu {
			animation: reveal-menu 240ms ease-out var(--network-menu-delay) backwards;
		}
	}

	@keyframes settle-phone {
		from {
			transform: translateY(4px) scale(0.965);
		}
		to {
			transform: none;
		}
	}

	@keyframes reveal-wallet-detail {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	@keyframes open-network-trigger {
		from {
			fill: var(--color-background-primary);
		}
	}

	@keyframes turn-network-chevron {
		from {
			rotate: 0deg;
		}
	}

	@keyframes reveal-menu {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
