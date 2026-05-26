#!/usr/bin/env node
'use strict';

const Converter = require('../lib/converter.js');

function readStdin() {
	return new Promise((resolve, reject) => {
		let data = '';
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', chunk => { data += chunk; });
		process.stdin.on('end', () => resolve(data));
		process.stdin.on('error', reject);
	});
}

function extract(input) {
	if (input && input.fields && input.fields.description) {
		return { adf: input.fields.description, summary: input.fields.summary };
	}
	return { adf: input, summary: null };
}

(async () => {
	try {
		const raw = await readStdin();
		if (!raw.trim()) {
			process.stderr.write('error: no input on stdin\n');
			process.exit(1);
		}

		const parsed = JSON.parse(raw);
		const { adf, summary } = extract(parsed);
		const { result, warnings } = Converter.convert(adf);

		const heading = summary ? `# ${summary}\n\n` : '';
		process.stdout.write(heading + result + '\n');

		if (warnings.size > 0) {
			process.stderr.write(`warning: unhandled node types: ${[...warnings].join(', ')}\n`);
		}
	} catch (err) {
		process.stderr.write(`error: ${err.message}\n`);
		process.exit(1);
	}
})();
