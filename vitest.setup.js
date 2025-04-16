import { buildParserFile } from '@lezer/generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, 'src');

function generateParsers() {
  const entries = fs.readdirSync(SRC_DIR, { recursive: true });
  const grammarFiles = entries.filter(fn => fn.endsWith('.grammar')).map(fn => path.join(SRC_DIR, fn));

  for (const grammarFile of grammarFiles) {
    const grammarText = fs.readFileSync(grammarFile, 'utf8');
    const { parser } = buildParserFile(grammarText, { fileName: grammarFile });

    const outputFile = `${grammarFile}.js`;
    fs.writeFileSync(outputFile, parser, 'utf8');

    console.log(`Generated parser: ${path.relative(SRC_DIR, outputFile)}`);
  }
}

generateParsers();
