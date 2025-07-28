import { isNullish, nonNullish } from '@dfinity/utils';
import dotenv from 'dotenv';
import { Contract } from 'ethers/contract';
import { EtherscanProvider } from 'ethers/providers';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import path from 'path';
import { ENV } from './build.utils.mjs';
import { CK_ERC20_JSON_FILE } from './constants.mjs';

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

const DATA_DIR = 'src/frontend/src/env/tokens';
const DATA_DIR_PATH = resolve(process.cwd(), DATA_DIR);

const ERC20_DATA_DIR = `${DATA_DIR}/tokens-erc20`;
const ERC20_DATA_DIR_PATH = resolve(process.cwd(), ERC20_DATA_DIR);

const SVG_DIR = 'src/frontend/src/icp-eth/assets';
const SVG_DIR_PATH = resolve(process.cwd(), SVG_DIR);

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const unescapeRegExp = (string) => string.replace(/\\([.*+?^${}()|/[\]\\])/g, '$1');

const addElementListInContent = ({ content, regex, element, addAtStartIfNotFound = false }) => {
	const match = content.match(regex);
	if (match) {
		const list = match[1].trim();
		if (!list.includes(element)) {
			const updatedList = list ? `${list}, ${element}` : element;
			return {
				content: content.replace(regex, match[0].replace(match[1], updatedList)),
				hasChanged: true
			};
		}
		return { content, hasChanged: false };
	}
	const newLine = unescapeRegExp(regex.source.replace('([\\s\\S]*?)', element));
	return {
		content: addAtStartIfNotFound ? `${newLine}\n${content}` : `${content}\n${newLine}`,
		hasChanged: true
	};
};

const updateListInContent = ({ content, regex, elements, addAtStartIfNotFound = false }) =>
	elements.reduce(
		(acc, element) => {
			const { content: newContent, hasChanged } = addElementListInContent({
				content: acc.content,
				regex,
				element,
				addAtStartIfNotFound
			});
			return {
				content: newContent,
				hasChanged: acc.hasChanged ?? hasChanged
			};
		},
		{ content, hasChanged: false }
	);

const updateImportsInContent = ({ content, imports, module }) =>
	updateListInContent({
		content,
		regex: new RegExp(`import \\{([\\s\\S]*?)} from '${escapeRegExp(module)}';`),
		elements: imports,
		addAtStartIfNotFound: true
	});

const fetchTokenDetails = async ({ contractAddress, isTestnet }) => {
	const provider = new EtherscanProvider(isTestnet ? 'sepolia' : 'homestead', ETHERSCAN_API_KEY);
	const contract = new Contract(
		contractAddress,
		[
			'function name() view returns (string)',
			'function decimals() view returns (uint8)',
			'function symbol() public view returns (string)'
		],
		provider
	);

	const [name, decimals, symbol] = await Promise.all([
		contract.name(),
		contract.decimals(),
		contract.symbol()
	]).catch((err) => {
		console.error(`Error fetching token details:\n${err}`);
		process.exit(1);
	});

	return { name, decimals, symbol };
};

const loadFileContentOrEmpty = (filePath) => {
	try {
		return readFileSync(filePath, 'utf8');
	} catch (_err) {
		console.log(`File ${filePath} does not exist, it will be created.`);
		return '';
	}
};

let filesCreatedOrModified = false;
const manageEnvFile = async ({ mainSymbol: symbol, contractAddress, testnetContractAddress }) => {
	const fileName = `tokens.${symbol.toLowerCase()}.env.ts`;
	const filePath = path.join(ERC20_DATA_DIR_PATH, fileName);

	const existingFileContent = loadFileContentOrEmpty(filePath);

	const mainnetToken = nonNullish(contractAddress) ? `${symbol}_TOKEN` : undefined;
	const testnetToken = nonNullish(testnetContractAddress) ? `SEPOLIA_${symbol}_TOKEN` : undefined;

	const mainnetTokenCreated = existingFileContent.split(/\W+/).includes(mainnetToken ?? '');
	const testnetTokenCreated = existingFileContent.split(/\W+/).includes(testnetToken ?? '');

	if (mainnetTokenCreated && testnetTokenCreated) {
		console.log(`Variables for token ${symbol} already exists in the environment file ${fileName}`);
		return { fileName, mainnetToken: undefined, testnetToken: undefined };
	}

	const {
		name: mainnetName,
		decimals: mainnetDecimals,
		symbol: mainnetSymbol
	} = nonNullish(contractAddress)
		? await fetchTokenDetails({ contractAddress, isTestnet: false })
		: {};
	const {
		name: testnetName,
		decimals: testnetDecimals,
		symbol: testnetSymbol
	} = nonNullish(testnetContractAddress)
		? await fetchTokenDetails({
				contractAddress: testnetContractAddress,
				isTestnet: true
			})
		: {};

	const icon = symbol.toLowerCase();

	const fileContentFirstPart =
		existingFileContent !== ''
			? existingFileContent
			: `import type { RequiredErc20Token } from '$eth/types/erc20';
import ${icon} from '$icp-eth/assets/${icon}.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/utils/zod.utils';
`;

	const { content: fileContentFirstPartWithImports } = updateImportsInContent({
		content: fileContentFirstPart,
		imports: [
			...(!mainnetTokenCreated ? ['ETHEREUM_NETWORK'] : []),
			...(!testnetTokenCreated ? ['SEPOLIA_NETWORK'] : [])
		],
		module: '$env/networks.env'
	});

	const decimalsConst = `export const ${symbol}_DECIMALS = ${mainnetDecimals ?? testnetDecimals};`;
	const fileContentDecimalsConst = !existingFileContent.includes(decimalsConst)
		? `\n${decimalsConst}\n`
		: '';

	const newFileContentMainnet =
		nonNullish(mainnetToken) && !mainnetTokenCreated
			? `
export const ${symbol}_SYMBOL = '${mainnetSymbol}';

export const ${symbol}_TOKEN_ID: TokenId = parseTokenId(${symbol}_SYMBOL);

export const ${mainnetToken}: RequiredErc20Token = {
	id: ${symbol}_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: '${mainnetName}',
	symbol: ${symbol}_SYMBOL,
	decimals: ${symbol}_DECIMALS,
	icon: ${icon},
	address: '${contractAddress}',
	exchange: 'erc20',
	twinTokenSymbol: 'ck${symbol}'
};
`
			: '';

	const newFileContentTestnet =
		nonNullish(testnetToken) && !testnetTokenCreated
			? `
export const SEPOLIA_${symbol}_SYMBOL = 'Sepolia${testnetSymbol}';

export const SEPOLIA_${symbol}_TOKEN_ID: TokenId = parseTokenId(SEPOLIA_${symbol}_SYMBOL);

export const ${testnetToken}: RequiredErc20Token = {
	id: SEPOLIA_${symbol}_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: '${testnetName}',
	symbol: '${testnetSymbol}',
	decimals: ${symbol}_DECIMALS,
	icon: ${icon},
	address: '${testnetContractAddress}',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepolia${symbol}'
};
`
			: '';

	if (newFileContentMainnet + newFileContentTestnet === '') {
		console.log(`No new variables to create for token ${symbol}`);
		return { fileName, mainnetToken: undefined, testnetToken: undefined };
	}

	const newFileContent =
		fileContentFirstPartWithImports +
		fileContentDecimalsConst +
		newFileContentMainnet +
		newFileContentTestnet;
	writeFileSync(filePath, newFileContent);
	filesCreatedOrModified = true;

	if (newFileContentMainnet !== '') {
		console.log(`Created new mainnet variables for token ${symbol} in file ${filePath}`);
	}

	if (newFileContentTestnet !== '') {
		console.log(`Created new testnet variables for token ${symbol} in file ${filePath}`);
	}

	return {
		fileName,
		mainnetToken: newFileContentMainnet !== '' ? mainnetToken : undefined,
		testnetToken: newFileContentTestnet !== '' ? testnetToken : undefined
	};
};

const updateTokensErc20Env = ({ fileName, mainnetToken, testnetToken }) => {
	const filePath = path.join(DATA_DIR_PATH, 'tokens.erc20.env.ts');
	let content = readFileSync(filePath, 'utf8');

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

	regexList
		.filter(({ token }) => nonNullish(token))
		.forEach(({ regex, token }) => {
			const { content: newContent, hasChanged } = addElementListInContent({
				content,
				regex,
				element: token
			});
			if (hasChanged) {
				content = newContent;
				console.log(`Included ${token} in token list in ${filePath}`);
			}
		});

	if (nonNullish(mainnetToken) || nonNullish(testnetToken)) {
		const imports = [mainnetToken, testnetToken].filter(Boolean);
		const { content: newContent, hasChanged } = updateImportsInContent({
			content,
			imports,
			module: `$env/tokens-erc20/${fileName.replace('.ts', '')}`
		});
		if (hasChanged) {
			content = newContent;
			console.log(`Added import statement for ${imports.join(', ')} in ${filePath}`);
		}
	}

	writeFileSync(filePath, content);
};

const flattenData = (data) =>
	Object.keys(data).map((symbol) => ({
		symbol,
		...data[symbol]
	}));

const flattenEnvironmentData = (data) =>
	Object.entries(data).reduce(
		(acc, [environment, values]) => ({
			...acc,
			[environment]: flattenData(values)
		}),
		{}
	);

const readSupportedTokens = () => {
	const jsonPath = resolve(CK_ERC20_JSON_FILE);
	return JSON.parse(readFileSync(jsonPath, 'utf-8'));
};

const parseTokens = (tokens) => {
	const { production: prodTokens, staging: testnetTokens } = flattenEnvironmentData(tokens);

	const acc = {};

	prodTokens.forEach(({ symbol, erc20ContractAddress }) => {
		const mainSymbol = symbol.slice(2);
		acc[mainSymbol] = {
			mainSymbol,
			contractAddress: erc20ContractAddress,
			testnetContractAddress: acc[mainSymbol]?.testnetContractAddress
		};
	});

	testnetTokens.forEach(({ symbol, erc20ContractAddress }) => {
		const mainSymbol = symbol.replace('Sepolia', '').slice(2);
		acc[mainSymbol] ??= { mainSymbol };
		acc[mainSymbol].testnetContractAddress = erc20ContractAddress;
	});

	return Object.values(acc);
};

const main = async () => {
	const tokens = readSupportedTokens();

	const tokensToProcess = parseTokens(tokens);

	if (tokensToProcess.length === 0) {
		console.log('No new token found to process.');
		return;
	}

	console.log(
		`Found ${tokensToProcess.length} tokens to check: ${tokensToProcess.map(({ mainSymbol }) => mainSymbol).join(', ')}`
	);

	const newTokens = [];

	for (const token of tokensToProcess) {
		const { mainSymbol } = token;

		console.log('--------------------------------');
		console.log(`Checking if token ${mainSymbol} already exists in the environment files.`);

		const { fileName, mainnetToken, testnetToken } = await manageEnvFile(token);

		updateTokensErc20Env({ fileName, mainnetToken, testnetToken });

		if (nonNullish(mainnetToken) || nonNullish(testnetToken)) {
			newTokens.push(token);
		}
	}

	if (filesCreatedOrModified) {
		console.log('--------------------------------');
		console.log('Running npm run format && npm run lint');
		execSync('npm run format && npm run lint', { stdio: 'inherit' });
	}

	if (newTokens.length > 0) {
		console.log('--------------------------------');
		console.log(
			'Final Step: To complete the integration of the new tokens, you need to create SVG icon files for each token and place them in the correct directory.'
		);
		console.log(`Navigate to the following directory: ${path.join(SVG_DIR_PATH)}`);

		newTokens.forEach(({ mainSymbol }) => {
			console.log(
				`- For token ${mainSymbol}, create an SVG file named '${mainSymbol.toLowerCase()}.svg'`
			);
		});

		console.log(
			'Ensure that the SVG files are valid SVG format and represent the tokens, typically the logo or symbol of each token.'
		);

		newTokens.forEach(({ mainSymbol }) => {
			console.log(
				`Example: For token ${mainSymbol}, the SVG file should be: ${SVG_DIR_PATH}/${mainSymbol.toLowerCase()}.svg`
			);
		});
	}
};

try {
	await main();
} catch (err) {
	console.error(`Error in main function:\n${err}`);
	process.exit(1);
}
