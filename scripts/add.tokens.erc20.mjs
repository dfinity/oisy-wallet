import { isNullish, nonNullish } from '@dfinity/utils';
import { load } from 'cheerio';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { ENV } from './build.utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = resolve(__dirname, '../');

dotenv.config({ path: `.env.${ENV}` });

const getArgValue = (argName) => {
	const argIndex = process.argv.indexOf(argName);
	return argIndex > -1 ? process.argv[argIndex + 1] : null;
};

const ETHERSCAN_API_KEY = getArgValue('--etherscan-api-key') ?? process.env.VITE_ETHERSCAN_API_KEY;

if (isNullish(ETHERSCAN_API_KEY)) {
	console.error(
		`Missing VITE_ETHERSCAN_API_KEY. Please provide it in .env.${ENV} or via --etherscan-api-key argument.`
	);
	process.exit(1);
}

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

const createEnvFile = async (token) => {
	const { tokenName, contractAddress, testnetContractAddress } = token;

	const tokenDetails = await fetchTokenDetails(contractAddress);

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

	const regexList = [
		{
			regex: /const ERC20_TWIN_TOKENS_MAINNET: RequiredErc20Token\[] = \[([\s\S]*?)];/,
			token: mainnetToken
		},
		{
			regex: /const ERC20_TWIN_TOKENS_SEPOLIA: RequiredErc20Token\[] = \[([\s\S]*?)];/,
			token: testnetToken
		}
	];

	regexList.forEach(({ regex, token }) => {
		const match = content.match(regex);
		if (match) {
			const tokensList = match[1].trim();
			const updatedTokensList = tokensList ? `${tokensList}, ${token}` : token;
			content = content.replace(
				regex,
				`${match[0].split(':')[0]}: RequiredErc20Token[] = [${updatedTokensList}];`
			);
		}
	});

	const importStatement = `import { ${mainnetToken}, ${testnetToken} } from '$env/${newFileName.replace('.ts', '')}';\n`;
	content = importStatement + content;

	await fs.writeFile(filePath, content);
	console.log(`Updated ${filePath}`);
};

const fetchSupportedTokensByUrl = async (url) => {
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

const getCanisterId = async (network) => {
	const dfxJsonPath = path.resolve(rootPath, 'dfx.json');
	const dfxJson = JSON.parse(await fs.readFile(dfxJsonPath, 'utf-8'));
	return dfxJson.canisters.cketh_minter.remote.id[network];
};

const fetchTokensForEnvironment = async (network) => {
	const canisterId = await getCanisterId(network);
	const dashboardUrl = `https://${canisterId}.raw.icp0.io/dashboard`;
	return await fetchSupportedTokensByUrl(dashboardUrl);
};

const fetchSupportedTokens = async () => {
	const [prodTokens, testnetTokens] = await Promise.all([
		fetchTokensForEnvironment('ic'),
		fetchTokensForEnvironment('staging')
	]);

	return { prodTokens, testnetTokens };
};

const filterTokens = async (prodTokens, testnetTokens) => {
	const testnetTokenMap = new Map(
		testnetTokens.map((token) => [token.symbol.replace('ckSepolia', 'ck'), token.contractAddress])
	);

	const results = await Promise.all(
		prodTokens
			.filter((token) => nonNullish(testnetTokenMap.get(token.symbol)))
			.map(async (token) => {
				const tokenName = token.symbol.slice(2);
				const tokenFilePath = path.join(SRC_PATH, `tokens.${tokenName.toLowerCase()}.env.ts`);
				try {
					await fs.access(tokenFilePath);
					return null; // File already exists, filter it out
				} catch (err) {
					if (err.code === 'ENOENT') {
						return token; // File doesn't exist, process this token
					} else {
						throw err;
					}
				}
			})
	);

	return results.filter(nonNullish).map((token) => {
		return {
			tokenName: token.symbol.slice(2),
			symbol: token.symbol,
			contractAddress: token.contractAddress,
			testnetContractAddress: testnetTokenMap.get(token.symbol)
		};
	});
};

const main = async () => {
	const { prodTokens, testnetTokens } = await fetchSupportedTokens();

	const tokensToProcess = await filterTokens(prodTokens, testnetTokens);

	if (tokensToProcess.length === 0) {
		console.log('No new token found to process.');
		console.log(
			'Be aware that the script only processes tokens that are not already in the env directory and that have a testnet counterpart.'
		);
		return;
	}

	for (const token of tokensToProcess) {
		const { tokenName } = token;

		console.log('--------------------------------');
		console.log(`Creating file for token ${tokenName}`);

		const { newFileName, mainnetToken, testnetToken } = await createEnvFile(token);

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

try {
	await main();
} catch (err) {
	console.error(`Error in main function:\n${err}`);
	process.exit(1);
}
