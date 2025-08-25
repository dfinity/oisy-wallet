#!/usr/bin/env node

import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ENV, findHtmlFiles } from './build.utils.mjs';

config({ path: `.env.${ENV}` });

const buildCsp = (htmlFile) => {
	// 1. We extract the start script parsed by SvelteKit into the html file
	const indexHTMLWithoutStartScript = extractStartScript(htmlFile);
	// 2. We add our custom script loader - we inject it at build time because it would throw an error when developing locally if missing
	const indexHTMLWithScriptLoader = injectScriptLoader(indexHTMLWithoutStartScript);
	// 3. Replace preloaders
	const indexHTMLWithPreloaders = injectLinkPreloader(indexHTMLWithScriptLoader);
	// 4. remove the content-security-policy tag injected by SvelteKit
	const indexHTMLNoCSP = removeDefaultCspTag(indexHTMLWithPreloaders);
	// 5. We calculate the sha256 values for these scripts and update the CSP
	const indexHTMLWithCSP = updateCSP(indexHTMLNoCSP);

	writeFileSync(htmlFile, indexHTMLWithCSP);
};

const removeDefaultCspTag = (indexHtml) => {
	return indexHtml.replace('<meta http-equiv="content-security-policy" content="">', '');
};

/**
 * We need a script loader to implement a proper Content Security Policy. See `updateCSP` doc for more information.
 */
const injectScriptLoader = (indexHtml) => {
	return indexHtml.replace(
		'<!-- SCRIPT_LOADER -->',
		`<script sveltekit-loader>
      const loader = document.createElement("script");
      loader.type = "module";
      loader.src = "main.js";
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

	// 1. Inject pre-loaders dynamically after load
	const loader = `<script sveltekit-preloader>
      const links = [${links.map(({ src }) => `'${src}'`)}];
      for (const link of links) {
          const preloadLink = document.createElement("link");
          preloadLink.href = link;
          preloadLink.rel = "preload";
          preloadLink.as = "script";
          document.head.appendChild(loader);
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
 * As workaround:
 * 1. we extract the start script that is injected by SvelteKit in index.html into a separate main.js
 * 2. we remove the script content from index.html but, let the script tag as anchor
 * 3. we use our custom script loader to load the main.js script
 */
const extractStartScript = (htmlFile) => {
	const indexHtml = readFileSync(htmlFile, 'utf8');

	const svelteKitStartScript = /(<script>)([\s\S]*?)(<\/script>)/gm;

	// 1. extract SvelteKit start script to a separate main.js file
	const [_script, _scriptStartTag, content, _scriptEndTag] = svelteKitStartScript.exec(indexHtml);
	const inlineScript = content.replace(/^\s*/gm, '');

	// Each file needs its own main.js because the script that calls the SvelteKit start function contains information dedicated to the route
	// i.e. the routeId and a particular id for the querySelector use to attach the content
	const folderPath = dirname(htmlFile);

	// 2. Extract the SvelteKit script into a separate file

	// We need to replace the document.currentScript.parentElement because the script is added to the head. SvelteKit except the <body /> element as initial parameter.
	// We also need to attach explicitly to the `window` the __sveltekit_ variables because they are not defined in the global scope but are used as global.
	const moduleScript = inlineScript
		.replaceAll('document.currentScript.parentElement', "document.querySelector('body')")
		.replaceAll(/__sveltekit_(.*)\s=/g, 'window.$&');

	writeFileSync(join(folderPath, 'main.js'), moduleScript, 'utf8');

	// 3. Replace original SvelteKit script tag content with empty
	return indexHtml.replace(svelteKitStartScript, '$1$3');
};

/**
 * Inject "Content Security Policy" (CSP) into index.html for production build
 */
const updateCSP = (indexHtml) => {
	const sw = /<script[\s\S]*?>([\s\S]*?)<\/script>/gm;

	const indexHashes = [];

	let m;
	while ((m = sw.exec(indexHtml))) {
		const content = m[1];

		indexHashes.push(`'sha256-${createHash('sha256').update(content).digest('base64')}'`);
	}

	const ethMainnetConnectSrc =
		'https://api.etherscan.io wss://eth-mainnet.g.alchemy.com https://eth-mainnet.g.alchemy.com https://mainnet.infura.io';
	const ethSepoliaConnectSrc =
		'https://api-sepolia.etherscan.io https://sepolia.infura.io wss://eth-sepolia.g.alchemy.com https://eth-sepolia.g.alchemy.com';

	const walletConnectSrc = 'wss://relay.walletconnect.com https://verify.walletconnect.com';
	const walletConnectFrameSrc = 'https://verify.walletconnect.com https://verify.walletconnect.org';

	const csp = `<meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none';
        connect-src 'self' https://ic0.app https://icp0.io https://icp-api.io ${ethMainnetConnectSrc} ${ethSepoliaConnectSrc} ${walletConnectSrc};
        img-src 'self' data:;
        frame-src 'self' ${walletConnectFrameSrc};
        manifest-src 'self';
        script-src 'unsafe-eval' 'unsafe-inline' 'strict-dynamic' ${indexHashes.join(' ')};
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
