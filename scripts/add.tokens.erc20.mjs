import { load } from 'cheerio';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = resolve(__dirname, '../');

const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
const envPath = resolve(rootPath, envFile);
dotenv.config({ path: envPath });

const getArgValue = (argName) => {
	const argIndex = process.argv.indexOf(argName);
	return argIndex > -1 && argIndex < process.argv.length - 1 ? process.argv[argIndex + 1] : null;
};

const ETHERSCAN_API_KEY = getArgValue('--etherscan-api-key') || process.env.VITE_ETHERSCAN_API_KEY;

if (!ETHERSCAN_API_KEY) {
	console.error(
		`Missing VITE_ETHERSCAN_API_KEY. Please provide it in ${envFile} or via --etherscan-api-key argument.`
	);
	process.exit(1);
}

const PROD_DASHBOARD_URL = 'https://sv3dd-oaaaa-aaaar-qacoa-cai.raw.icp0.io/dashboard';
const TESTNET_DASHBOARD_URL = 'https://jzenf-aiaaa-aaaar-qaa7q-cai.raw.icp0.io/dashboard';

const SRC_DIR = 'src/frontend/src/env';
const SRC_PATH = resolve(rootPath, SRC_DIR);

const fetchHtml = async (url) => {
	const response = await fetch(url);
	return await response.text();
};

const fetchTokenDetails = async (contractAddress) => {
	const provider = new ethers.providers.EtherscanProvider('homestead', ETHERSCAN_API_KEY);
	const contract = new ethers.Contract(
		contractAddress,
		[
			'function name() view returns (string)',
			'function symbol() view returns (string)',
			'function decimals() view returns (uint8)'
		],
		provider
	);

	const [name, symbol, decimals] = await Promise.all([
		contract.name(),
		contract.symbol(),
		contract.decimals()
	]).catch((err) => {
		console.error(`Error fetching token details:\n${err}`);
		process.exit(1);
	});

	return { name, symbol, decimals };
};

const createEnvFile = async (tokenName, tokenDetails, contractAddress, testnetContractAddress) => {
	const newFileName = `tokens.${tokenName.toLowerCase()}.env.ts`;
	const newFilePath = path.join(SRC_PATH, newFileName);

	try {
		await fs.access(newFilePath);
		console.log(`File ${newFilePath} already exists.`);
		return;
	} catch (err) {
		// File does not exist, proceed with creation
	}

	const mainnetToken = `${tokenDetails.symbol}_TOKEN`;
	const testnetToken = `SEPOLIA_${tokenDetails.symbol}_TOKEN`;

	const newContent = `import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import ${tokenName.toLowerCase()} from '$icp-eth/assets/${tokenName.toLowerCase()}.svg';

export const ${tokenDetails.symbol}_DECIMALS = ${tokenDetails.decimals};

export const ${tokenDetails.symbol}_SYMBOL = '${tokenDetails.symbol}';

export const ${tokenDetails.symbol}_TOKEN_ID: unique symbol = Symbol(${tokenDetails.symbol}_SYMBOL);

export const ${mainnetToken}: RequiredErc20Token = {
	id: ${tokenDetails.symbol}_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: '${tokenDetails.name}',
	symbol: '${tokenDetails.symbol}',
	decimals: ${tokenDetails.symbol}_DECIMALS,
	icon: ${tokenName.toLowerCase()},
	address: '${contractAddress}',
	exchange: 'erc20',
	twinTokenSymbol: 'ck${tokenDetails.symbol}'
};

export const SEPOLIA_${tokenDetails.symbol}_SYMBOL = 'Sepolia${tokenDetails.symbol}';

export const SEPOLIA_${tokenDetails.symbol}_TOKEN_ID: unique symbol = Symbol(SEPOLIA_${tokenDetails.symbol}_SYMBOL);

export const ${testnetToken}: RequiredErc20Token = {
	id: SEPOLIA_${tokenDetails.symbol}_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: '${tokenDetails.name}',
	symbol: '${tokenDetails.symbol}',
	decimals: ${tokenDetails.symbol}_DECIMALS,
	icon: ${tokenName.toLowerCase()},
	address: '${testnetContractAddress}',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepolia${tokenDetails.symbol}'
};
`;

	await fs.writeFile(newFilePath, newContent);
	console.log(`Created ${newFilePath}`);

	return { newFileName, mainnetToken, testnetToken };
};

const updateTokensErc20Env = async (newFileName, mainnetToken, testnetToken) => {
	const filePath = path.join(SRC_PATH, 'tokens.erc20.env.ts');
	let content = await fs.readFile(filePath, 'utf8');

	const mainnetRegex = /const ERC20_TWIN_TOKENS_MAINNET: RequiredErc20Token\[] = \[([\s\S]*?)];/;
	const sepoliaRegex = /const ERC20_TWIN_TOKENS_SEPOLIA: RequiredErc20Token\[] = \[([\s\S]*?)];/;

	const mainnetMatch = content.match(mainnetRegex);
	const sepoliaMatch = content.match(sepoliaRegex);

	if (mainnetMatch) {
		const tokensList = mainnetMatch[1].trim();
		const updatedTokensList = tokensList ? `${tokensList}, ${mainnetToken}` : mainnetToken;
		content = content.replace(
			mainnetRegex,
			`const ERC20_TWIN_TOKENS_MAINNET: RequiredErc20Token[] = [${updatedTokensList}];`
		);
	}

	if (sepoliaMatch) {
		const tokensList = sepoliaMatch[1].trim();
		const updatedTokensList = tokensList ? `${tokensList}, ${testnetToken}` : testnetToken;
		content = content.replace(
			sepoliaRegex,
			`const ERC20_TWIN_TOKENS_SEPOLIA: RequiredErc20Token[] = [${updatedTokensList}];`
		);
	}

	const importStatement = `import { ${mainnetToken}, ${testnetToken} } from '$env/${newFileName.replace('.ts', '')}';\n`;
	content = importStatement + content;

	await fs.writeFile(filePath, content);
	console.log(`Updated ${filePath}`);
};

const fetchSupportedTokens = async (url) => {
	try {
		const html = await fetchHtml(url);
		const $ = load(html);

		const tokens = [];
		$('#supported-ckerc20-tokens + table tbody tr').each((index, element) => {
			const symbol = $(element).find('td').eq(0).text().trim();
			const contractAddress = $(element).find('td').eq(2).text().trim();
			tokens.push({ symbol, contractAddress });
		});

		console.log(
			`Found ${tokens.length} tokens on ${url}: ${tokens.map((t) => t.symbol).join(', ')}`
		);

		return tokens;
	} catch (err) {
		console.error(`Error fetching supported tokens on ${url}:\n${err}`);
		process.exit(1);
	}
};

const main = async () => {
	const prodTokens = await fetchSupportedTokens(PROD_DASHBOARD_URL);
	const testnetTokens = await fetchSupportedTokens(TESTNET_DASHBOARD_URL);

	const testnetTokenMap = new Map(
		testnetTokens.map((token) => [token.symbol.replace('ckSepolia', 'ck'), token.contractAddress])
	);

	const tokensToProcess = [];

	for (const token of prodTokens) {
		const testnetContractAddress = testnetTokenMap.get(token.symbol);
		if (!testnetContractAddress) {
			continue;
		}

		const tokenName = token.symbol.slice(2);
		const tokenFilePath = path.join(SRC_PATH, `tokens.${tokenName.toLowerCase()}.env.ts`);
		try {
			await fs.access(tokenFilePath);
		} catch (err) {
			tokensToProcess.push({
				tokenName,
				symbol: token.symbol,
				contractAddress: token.contractAddress,
				testnetContractAddress
			});
		}
	}

	if (tokensToProcess.length === 0) {
		console.log('All prod tokens that have a test token are set.');
		return;
	}

	for (const { tokenName, contractAddress, testnetContractAddress } of tokensToProcess) {
		console.log('--------------------------------');
		console.log(`Creating file for token ${tokenName}`);
		const tokenDetails = await fetchTokenDetails(contractAddress);

		const { newFileName, mainnetToken, testnetToken } = await createEnvFile(
			tokenName,
			tokenDetails,
			contractAddress,
			testnetContractAddress
		);

		await updateTokensErc20Env(newFileName, mainnetToken, testnetToken);

		console.log(`Finished for token ${tokenName}`);
	}

	console.log('--------------------------------');
	console.log(
		'Final Step: To complete the integration of the new tokens, you need to create SVG icon files for each token and place them in the correct directory.'
	);
	console.log(`Navigate to the following directory: ${path.join(SRC_DIR)}`);

	tokensToProcess.forEach(({ tokenName }) => {
		console.log(
			`- For token ${tokenName}, create an SVG file named '${tokenName.toLowerCase()}.svg'`
		);
	});

	console.log(
		'Ensure that the SVG files are valid SVG format and represent the tokens, typically the logo or symbol of each token.'
	);

	tokensToProcess.forEach(({ tokenName }) => {
		console.log(
			`Example: For token ${tokenName}, the SVG file should be: ${SRC_DIR}/${tokenName.toLowerCase()}.svg`
		);
	});
};

main().catch(console.error);
