#!/usr/bin/env node

import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ENV, findHtmlFiles } from './build.utils.mjs';

config({ path: `.env.${ENV}` });

const buildCsp = (htmlFile) => {
	// 1. We extract the start script parsed by SvelteKit into the HTML file
	const indexHTMLWithoutStartScript = extractStartScript(htmlFile);
	// 2. We add our custom script loader - we inject it at build time because it would throw an error when developing locally if missing
	const indexHTMLWithScriptLoader = injectScriptLoader({
		content: indexHTMLWithoutStartScript,
		filePath: htmlFile
	});
	// 3. Replace preloaders
	const indexHTMLWithPreloaders = injectLinkPreloader(indexHTMLWithScriptLoader);
	// 4. remove the content-security-policy tag injected by SvelteKit
	const indexHTMLNoCSP = removeDefaultCspTag(indexHTMLWithPreloaders);
	// 5. We calculate the sha256 values for these scripts and update the CSP
	const indexHTMLWithCSP = updateCSP(indexHTMLNoCSP);

	writeFileSync(htmlFile, indexHTMLWithCSP);
};

const removeDefaultCspTag = (indexHtml) =>
	indexHtml.replace('<meta http-equiv="content-security-policy" content="">', '');

/**
 * We need a script loader to implement a proper Content Security Policy. See the `updateCSP` doc for more information.
 */
const injectScriptLoader = ({ content, filePath }) => {
	// We need to provide the relative path to the script; otherwise, it will be resolved from the root at runtime.
	// This isn't an issue if all loaders are consistent and use the same name,
	// but it could become a problem if Svelte changes its approach, or we start hashing the script names.
	const buildDir = join(process.cwd(), 'build');
	const scriptName = 'main.js';

	const parentFolders = relative(buildDir, dirname(filePath));
	const loaderSrc = `${parentFolders !== '' ? `/${parentFolders}/` : ''}${scriptName}`;

	return content.replace(
		'<!-- SCRIPT_LOADER -->',
		`<script sveltekit-loader>
      const loader = document.createElement("script");
      loader.type = "module";
      loader.src = "${loaderSrc}";
      document.head.appendChild(loader);
    </script>`
	);
};

/**
 * Calculating the sh256 value for the preloaded link and whitelisting these seem not to be supported by the Content-Security-Policy.
 * Instead, we transform these in dynamic scripts and add the sha256 value of the script to the script-src policy of the CSP.
 */
const injectLinkPreloader = (indexHtml) => {
	const preload = /<link rel="preload"[\s\S]*?href="([\s\S]*?)">/gm;

	const links = [];

	let p;
	while ((p = preload.exec(indexHtml))) {
		const [linkTag, src] = p;

		links.push({
			linkTag,
			src
		});
	}

	// 1. Inject pre-loaders dynamically after loading
	const loader = `<script sveltekit-preloader>
      const links = [${links.map(({ src }) => `'${src}'`)}];
      for (const link of links) {
          const preloadLink = document.createElement("link");
          preloadLink.href = link;
          preloadLink.rel = "preload";
          preloadLink.as = "script";
          document.head.appendChild(preloadLink);
      }
    </script>`;

	let updateIndex = indexHtml.replace('<!-- LINKS_PRELOADER -->', loader);

	// 2. Remove original <link rel="preload" as="script" />
	for (const url of links) {
		const { linkTag } = url;
		updateIndex = updateIndex.replace(linkTag, '');
	}

	return updateIndex;
};

/**
 * Using a CSP with 'strict-dynamic' with SvelteKit breaks in Firefox.
 * Issue: https://github.com/sveltejs/kit/issues/3558
 *
 * As a workaround:
 * 1. we extract the start script injected by SvelteKit in index.html into a separate main.js
 * 2. we remove the script content from index.html but let the script tag as anchor
 * 3. we use our custom script loader to load the main.js script
 */
const extractStartScript = (htmlFile) => {
	const indexHtml = readFileSync(htmlFile, 'utf8');

	const svelteKitStartScript = /(<script>)([\s\S]*?)(<\/script>)/gim;

	// 1. extract SvelteKit start script to a separate main.js file
	const [_script, _scriptStartTag, content, _scriptEndTag] = svelteKitStartScript.exec(indexHtml);
	const inlineScript = content.replace(/^\s*/gm, '');

	// Each file needs its own main.js because the script that calls the SvelteKit start function contains information dedicated to the route
	// i.e., the routeId and a particular id for the querySelector use to attach the content
	const folderPath = dirname(htmlFile);

	// 2. Extract the SvelteKit script into a separate file

	// We need to replace the document.currentScript.parentElement because the script is added to the head. SvelteKit except the <body /> element as an initial parameter.
	// We also need to attach explicitly to the `window` the __sveltekit_ variables because they are not defined in the global scope but are used as global.
	const moduleScript = inlineScript
		.replaceAll('document.currentScript.parentElement', "document.querySelector('body')")
		.replaceAll(/__sveltekit_(.*)\s=/g, 'window.$&');

	writeFileSync(join(folderPath, 'main.js'), moduleScript, 'utf8');

	// 3. Replace original SvelteKit script tag content with empty
	return indexHtml.replace(svelteKitStartScript, '$1$3');
};

/**
 * Inject "Content Security Policy" (CSP) into index.html for a production build
 *
 * Note about script-src and 'strict-dynamic':
 * Chrome 40+ / Firefox 31+ / Safari 15.4+ / Edge 15+ supports 'strict-dynamic'.
 * Safari 15.4 has been released recently - March 15, 2022 - that's why we add 'unsafe-inline' to the rules for backwards compatibility.
 * Browsers that support the 'strict-dynamic' rule will ignore these backwards directives (CSP 3).
 */
const updateCSP = (indexHtml) => {
	const sw = /<script[\s\S]*?>([\s\S]*?)<\/script[^\S\r\n]*[^>]*?>/gim;

	const indexHashes = [];

	let m;
	while ((m = sw.exec(indexHtml))) {
		const [_, content] = m;

		indexHashes.push(`'sha256-${createHash('sha256').update(content).digest('base64')}'`);
	}

	const ethMainnetConnectSrc =
		'https://api.etherscan.io wss://eth-mainnet.g.alchemy.com https://eth-mainnet.g.alchemy.com https://mainnet.infura.io';
	const ethSepoliaConnectSrc =
		'https://api-sepolia.etherscan.io https://sepolia.infura.io wss://eth-sepolia.g.alchemy.com https://eth-sepolia.g.alchemy.com';

	const baseMainnetConnectSrc =
		'wss://base-mainnet.g.alchemy.com https://base-mainnet.g.alchemy.com https://base-mainnet.infura.io';
	const baseSepoliaConnectSrc =
		'wss://base-sepolia.g.alchemy.com https://base-sepolia.g.alchemy.com https://base-sepolia.infura.io';
	const arbitrumMainnetConnectSrc =
		'wss://arb-mainnet.g.alchemy.com https://arb-mainnet.g.alchemy.com https://arbitrum-mainnet.infura.io';
	const arbitrumSepoliaConnectSrc =
		'wss://arb-sepolia.g.alchemy.com https://arb-sepolia.g.alchemy.com https://arbitrum-sepolia.infura.io';
	const bnbMainnetConnectSrc =
		'wss://bnb-mainnet.g.alchemy.com https://bnb-mainnet.g.alchemy.com https://bsc-mainnet.infura.io';
	const bnbTestnetConnectSrc =
		'wss://bnb-testnet.g.alchemy.com https://bnb-testnet.g.alchemy.com https://bsc-testnet.infura.io';
	const polygonMainnetConnectSrc =
		'wss://polygon-mainnet.g.alchemy.com https://polygon-mainnet.g.alchemy.com https://polygon-mainnet.infura.io https://gasstation.polygon.technology';
	const polygonAmoyConnectSrc =
		'wss://polygon-amoy.g.alchemy.com https://polygon-amoy.g.alchemy.com https://polygon-amoy.infura.io';
	const evmConnectSrc = `${baseMainnetConnectSrc} ${baseSepoliaConnectSrc} ${arbitrumMainnetConnectSrc} ${arbitrumSepoliaConnectSrc} ${bnbMainnetConnectSrc} ${bnbTestnetConnectSrc} ${polygonMainnetConnectSrc} ${polygonAmoyConnectSrc}`;

	const infuraConnectSrc = 'https://gas.api.infura.io';

	const blockstreamApiConnectSrc = 'https://blockstream.info';
	const blockchainApiConnectSrc = 'https://blockchain.info';

	const coingeckoApiConnectSrc = 'https://pro-api.coingecko.com';

	const paraswapApiConnectSrc = 'https://api.paraswap.io';

	const kongSwapApiConnectSrc = 'https://api.kongswap.io';

	const plausibleApiConnectSrc = 'https://plausible.io/api/event';

	const walletConnectSrc =
		'wss://relay.walletconnect.com wss://relay.walletconnect.org https://verify.walletconnect.com https://verify.walletconnect.org https://pulse.walletconnect.org';
	const walletConnectFrameSrc = 'https://verify.walletconnect.com https://verify.walletconnect.org';

	const onramperConnectFrameSrc = 'https://buy.onramper.dev https://buy.onramper.com';

	const solanaRpcApiConnectSrc =
		'https://api.mainnet-beta.solana.com wss://api.mainnet-beta.solana.com https://api.testnet.solana.com wss://api.testnet.solana.com https://api.devnet.solana.com wss://api.devnet.solana.com';
	const solanaAlchemyApiConnectSrc =
		'https://solana-mainnet.g.alchemy.com wss://solana-mainnet.g.alchemy.com https://solana-testnet.g.alchemy.com wss://solana-testnet.g.alchemy.com https://solana-devnet.g.alchemy.com wss://solana-devnet.g.alchemy.com';
	const solanaQuicknodeApiConnectSrc =
		'https://burned-little-dinghy.solana-mainnet.quiknode.pro wss://burned-little-dinghy.solana-mainnet.quiknode.pro wss://burned-little-dinghy.solana-testnet.quiknode.pro wss://burned-little-dinghy.solana-devnet.quiknode.pro';
	const solanaApiConnectSrc = `${solanaRpcApiConnectSrc} ${solanaAlchemyApiConnectSrc} ${solanaQuicknodeApiConnectSrc}`;

	const allConnectSrc =
		'https://ic0.app https://icp0.io https://icp-api.io' +
		` ${ethMainnetConnectSrc} ${ethSepoliaConnectSrc} ${evmConnectSrc} ${infuraConnectSrc} ${walletConnectSrc} ${onramperConnectFrameSrc} ${blockstreamApiConnectSrc} ${blockchainApiConnectSrc} ${coingeckoApiConnectSrc} ${solanaApiConnectSrc} ${plausibleApiConnectSrc} ${kongSwapApiConnectSrc} ${paraswapApiConnectSrc}`;

	// TODO: remove once the feature has been completed
	const NFTS_ENABLED = process.env.VITE_NFTS_ENABLED;

	const csp = `<meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none';
        connect-src 'self' ${NFTS_ENABLED ? 'https: wss:' : allConnectSrc};
        img-src 'self' https: ipfs: data:;
        frame-src 'self' ${walletConnectFrameSrc} ${onramperConnectFrameSrc};
        manifest-src 'self';
        script-src 'unsafe-inline' 'strict-dynamic' ${indexHashes.join(' ')};
        base-uri 'self';
        form-action 'none';
        style-src 'self' 'unsafe-inline';
        font-src 'self';
        upgrade-insecure-requests;"
    />`;

	return indexHtml.replace('<!-- CONTENT_SECURITY_POLICY -->', csp);
};

const htmlFiles = findHtmlFiles();
htmlFiles.forEach((htmlFile) => buildCsp(htmlFile));
