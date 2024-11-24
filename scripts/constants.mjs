import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), 'src', 'frontend', 'src', 'env');

export const CK_ERC20_JSON_FILE = join(DATA_DIR, 'tokens.ckerc20.json');

export const SNS_JSON_FILE = join(DATA_DIR, 'tokens.sns.json');
