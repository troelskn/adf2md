#!/usr/bin/env node
'use strict';

const fs = require('fs');
const Converter = require('./converter.js');

function readStdin() {
	return new Promise((resolve, reject) => {
		let data = '';
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', chunk => { data += chunk; });
		process.stdin.on('end', () => resolve(data));
		process.stdin.on('error', reject);
	});
}

function readInput(arg) {
	if (arg && arg !== '-') {
		return Promise.resolve(fs.readFileSync(arg, 'utf8'));
	}
	return readStdin();
}

function extract(input) {
	if (input && input.fields && input.fields.description) {
		const comments = (input.fields.comment && input.fields.comment.comments) || [];
		return { adf: input.fields.description, summary: input.fields.summary, comments };
	}
	return { adf: input, summary: null, comments: [] };
}

function formatComments(comments, warnings) {
	const parts = [];
	for (const c of comments) {
		if (!c.body || c.body.type !== 'doc') continue;
		const author = (c.author && c.author.displayName) || 'Unknown';
		const date = typeof c.created === 'string' ? c.created.slice(0, 10) : '';
		const heading = date ? `### ${author} — ${date}` : `### ${author}`;
		const { result, warnings: w } = Converter.convert(c.body);
		for (const x of w) warnings.add(x);
		parts.push(`${heading}\n\n${result}`);
	}
	return parts.length ? `\n\n## Comments\n\n${parts.join('\n\n')}` : '';
}

(async () => {
	try {
		const raw = await readInput(process.argv[2]);
		if (!raw.trim()) {
			process.stderr.write('error: no input\n');
			process.exit(1);
		}

		const parsed = JSON.parse(raw);
		const { adf, summary, comments } = extract(parsed);
		const { result, warnings } = Converter.convert(adf);

		const heading = summary ? `# ${summary}\n\n` : '';
		const commentsSection = formatComments(comments, warnings);
		process.stdout.write(heading + result + commentsSection + '\n');

		if (warnings.size > 0) {
			process.stderr.write(`warning: unhandled node types: ${[...warnings].join(', ')}\n`);
		}
	} catch (err) {
		process.stderr.write(`error: ${err.message}\n`);
		process.exit(1);
	}
})();
