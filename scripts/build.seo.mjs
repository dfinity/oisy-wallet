import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { OISY_IC_DOMAIN, findHtmlFiles } from './build.utils.mjs';

const OUTPUT_DIR = join(process.cwd(), 'build');
const SITE_ROOT_CANONICAL = OISY_IC_DOMAIN;

const updateCanonical = (htmlFilePath) => {
	// 1. We determine the route based on the output
	const routePath = dirname(relative(OUTPUT_DIR, htmlFilePath));

	// 2. Build the effective canonical route
	const canonicalPath = `${SITE_ROOT_CANONICAL}/${routePath}/`;

	// 2. Read content
	let html = readFileSync(htmlFilePath, 'utf-8');

	// 3. Update canonical
	html = html.replace(
		`<link href="${SITE_ROOT_CANONICAL}" rel="canonical" />`,
		`<link href="${canonicalPath}" rel="canonical" />`
	);

	// 4. Update og:url to reflect the canonical
	html = html.replace(
		`<meta content="${SITE_ROOT_CANONICAL}" property="og:url" />`,
		`<meta content="${canonicalPath}" property="og:url" />`
	);

	// 5. Save the content with the updated canonical URL
	writeFileSync(htmlFilePath, html);
};

// Do not replace canonical for root and 404 pages
const filterSubPages = (htmlFile) => dirname(htmlFile) !== OUTPUT_DIR;

const htmlFiles = findHtmlFiles().filter(filterSubPages);
htmlFiles.forEach(updateCanonical);

/**
 * Pages that carry their own share card instead of the wallet's.
 *
 * It has to happen here rather than in a `<svelte:head>`. `routes/+layout.ts`
 * sets `ssr = false`, so prerendering emits the shell and never renders a
 * component — a page's head reaches `document.head` only once it is live in a
 * browser, which is far too late for a crawler fetching the link for a preview.
 *
 * The copy is read from `en.json` so it stays in one place with the rest of the
 * product text. A crawler is served one prerendered document with no locale to
 * choose from, so English is what it gets either way.
 */
const SHARE_CARDS = [
	{
		route: 'tip',
		image: '/images/share-image-tip.webp',
		i18n: (en) => en.tip.share
	}
];

const escapeAttribute = (value) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Matches by attribute rather than by current content: `build.metadata.mjs` has
// already substituted the placeholders by the time this runs, so the value in
// the file is real text and not something predictable.
const replaceMeta = ({ html, attribute, key, value }) => {
	const pattern = new RegExp(`<meta content="[^"]*" ${attribute}="${key}" />`);

	if (!pattern.test(html)) {
		throw new Error(
			`Cannot set ${attribute}="${key}": no such meta tag in the built page. ` +
				`If app.html changed shape, this script has to change with it.`
		);
	}

	return html.replace(
		pattern,
		`<meta content="${escapeAttribute(value)}" ${attribute}="${key}" />`
	);
};

const applyShareCard = ({ route, image, i18n }) => {
	const htmlFilePath = join(OUTPUT_DIR, route, 'index.html');

	if (!existsSync(htmlFilePath)) {
		throw new Error(
			`Expected a prerendered page at build/${route}/index.html to attach a share card to. ` +
				`Is \`export const prerender = true\` still set on that route?`
		);
	}

	const en = JSON.parse(
		readFileSync(join(process.cwd(), 'src/frontend/src/lib/i18n/en.json'), 'utf-8')
	);
	const { title, description } = i18n(en);
	const imageUrl = `${SITE_ROOT_CANONICAL}${image}`;

	let html = readFileSync(htmlFilePath, 'utf-8');

	for (const meta of [
		{ attribute: 'property', key: 'og:title', value: title },
		{ attribute: 'property', key: 'og:description', value: description },
		{ attribute: 'property', key: 'og:image', value: imageUrl },
		{ attribute: 'name', key: 'twitter:title', value: title },
		{ attribute: 'name', key: 'twitter:description', value: description },
		{ attribute: 'name', key: 'twitter:image', value: imageUrl },
		{ attribute: 'name', key: 'description', value: description }
	]) {
		html = replaceMeta({ html, ...meta });
	}

	writeFileSync(htmlFilePath, html);

	console.log(`Share card attached to build/${route}/index.html`);
};

SHARE_CARDS.forEach(applyShareCard);
