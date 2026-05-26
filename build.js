#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const libDir = path.join(root, 'lib');
const outPath = path.join(root, 'bin', 'adf2md');

function stripShebang(src) {
	return src.replace(/^#![^\n]*\n/, '');
}

function stripUseStrict(src) {
	return src.replace(/^['"]use strict['"];\s*\n/, '');
}

function indent(src, prefix) {
	return src.split('\n').map(line => line.length ? prefix + line : line).join('\n');
}

const converterSrc = stripUseStrict(stripShebang(
	fs.readFileSync(path.join(libDir, 'converter.js'), 'utf8')
));

const mainSrc = stripUseStrict(stripShebang(
	fs.readFileSync(path.join(libDir, 'main.js'), 'utf8')
)).replace(/const Converter = require\(['"]\.\/converter\.js['"]\);\s*\n/, '');

const bundle = `#!/usr/bin/env node
'use strict';

const Converter = (() => {
\tconst module = { exports: {} };
${indent(converterSrc, '\t')}
\treturn module.exports;
})();

${mainSrc}`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, bundle);
fs.chmodSync(outPath, 0o755);
console.log(`built ${path.relative(root, outPath)} (${bundle.length} bytes)`);
