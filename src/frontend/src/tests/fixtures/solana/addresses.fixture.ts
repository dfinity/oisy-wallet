import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { NVDAX_TOKEN } from '$env/tokens/tokens-spl/tokens.nvdax.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';

export const fixtureSolAddresses = [
	'7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
	'GZvi7ndzTYkTrbvfiwfz9ZequdCMacHCzCtadruT3e5f',
	'EAQ6MUJMEEd42u9xHZ8XHrwabG5NNVhndKnTgBzZcMtt',
	'FLAevxSbe182oYzjNqDB53g11rbvhWMF1iUCoCHFfHV4'
];

export const fixtureSolAtaAddresses = [
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: '7xSNhASWK77oZtPyVQf1HFUXU1xxXjqkpkxVTULBmcMD',
		token: USDC_TOKEN
	},
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: 'CTZFRs7fNtgEastyD6XoBsc9ySDuZTtuRvaFbH86WRb',
		token: BONK_TOKEN
	},
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: '8E2dYm7NXBSb7qS3zRtxKDw7mjzPCqVKQCy2EDeujUC2',
		token: POPCAT_TOKEN
	},
	{
		address: '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1',
		ataAddress: '7t8FwZRQTRaqtaeGLGij4FBsH9t9Cf918inTz3BYpuA7',
		token: JUP_TOKEN
	},
	{
		address: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
		ataAddress: 'EF7heUqwgeSQ153PAdH9fR3tXn8QzbnMCdbshdpraFnA',
		token: NVDAX_TOKEN
	}
];
