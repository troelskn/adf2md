'use strict';

const Converter = module.exports;

function _convert(node, ctx) {
	const content = node.content || [];

	switch (node.type) {
		case 'doc':
			return content.map(node => _convert(node, ctx)).filter(s => s.length > 0).join('\n\n');

		case 'text':
			return `${_convertMarks(node, ctx)}`;

		case 'paragraph':
			return content.map(node => _convert(node, ctx)).join('');

		case 'heading':
			return `${'#'.repeat(node.attrs.level)} ${content.map(node => _convert(node, ctx)).join('')}`;

		case 'hardBreak':
			return '\n';

		case 'inlineCard':
		case 'blockCard':
		case 'embedCard':
			return `[${node.attrs.url}](${node.attrs.url})`;

		case 'blockquote':
			return `> ${content.map(node => _convert(node, ctx)).join('\n> ')}`;

		case 'bulletList':
		case 'orderedList':
			return _convertList(node, ctx);

		case 'listItem':
			return _convertListItem(node, '*', ctx);

		case 'codeBlock': {
			const language = node.attrs ? ` ${node.attrs.language}` : '';
			return `\`\`\`${language}\n${content.map(node => _convert(node, ctx)).join('\n')}\n\`\`\``;
		}

		case 'rule':
			return '\n\n---\n';

		case 'emoji':
			return node.attrs.shortName;

		case 'table':
			return content.map(node => _convert(node, ctx)).join('');

		case 'tableRow': {
			let output = '|';
			let thCount = 0;
			output += content.map((subNode) => {
				thCount += subNode.type === 'tableHeader' ? 1 : 0;
				return _convert(subNode, ctx);
			}).join('');
			output += thCount ? `\n${'|:-:'.repeat(thCount)}|\n` : '\n';
			return output;
		}

		case 'tableHeader':
			return `${content.map(node => _convert(node, ctx)).join('')}|`;

		case 'tableCell':
			return `${content.map(node => _convert(node, ctx)).join('')}|`;

		case 'panel': {
			const labels = { info: 'Info', note: 'Note', warning: 'Warning', success: 'Success', error: 'Error' };
			const label = labels[node.attrs && node.attrs.panelType] || 'Note';
			const body = content.map(n => _convert(n, ctx)).join('\n> ');
			return `> **${label}:** ${body}`;
		}

		case 'expand':
		case 'nestedExpand': {
			const title = (node.attrs && node.attrs.title) || '';
			const body = content.map(n => _convert(n, ctx)).join('\n\n');
			return `<details>\n<summary>${title}</summary>\n\n${body}\n\n</details>`;
		}

		case 'mediaSingle':
		case 'mediaGroup':
			return content.map(n => _convert(n, ctx)).filter(s => s.length > 0).join('\n');

		case 'media': {
			const attrs = node.attrs || {};
			if (attrs.url) {
				const alt = attrs.alt || '';
				return `![${alt}](${attrs.url})`;
			}
			if (attrs.id) {
				ctx.attachments.push(`attachment:${attrs.id}`);
			}
			return '';
		}

		case 'mention':
			return (node.attrs && node.attrs.text) || `@${node.attrs && node.attrs.id}`;

		case 'date': {
			const ts = node.attrs && node.attrs.timestamp;
			if (!ts) return '';
			return new Date(Number(ts)).toISOString().slice(0, 10);
		}

		case 'status':
			return (node.attrs && node.attrs.text) || '';

		default:
			ctx.warnings.add(node.type);
			return '';
	}
}

function _convertList(node, ctx) {
	const content = node.content || [];
	let counter = (node.attrs && node.attrs.order) || 1;
	return content.map((subNode) => {
		const symbol = node.type === 'bulletList' ? '*' : `${counter++}.`;
		return _convertListItem(subNode, symbol, ctx);
	}).join('\n');
}

function _convertListItem(node, symbol, ctx) {
	const content = node.content || [];
	const parts = content.map((child, i) => {
		const out = _convert(child, ctx);
		if (i === 0) return out.trimEnd();
		return out.split('\n').map(l => '  ' + l).join('\n');
	});
	const head = `  ${symbol} ${parts[0] || ''}`;
	return parts.length > 1 ? `${head}\n${parts.slice(1).join('\n')}` : head;
}

function _convertMarks(node, ctx) {
	if (!node.hasOwnProperty('marks') || !Array.isArray(node.marks)) {
		return node.text;
	}

	return node.marks.reduce((converted, mark) => {
		switch (mark.type) {
			case 'code':
				converted = `\`${converted}\``;
				break;

			case 'em':
				converted = `_${converted}_`;
				break;

			case 'link':
				converted = `[${converted}](${mark.attrs.href})`;
				break;

			case 'strike':
				converted = `~~${converted}~~`;
				break;

			case 'strong':
				converted = `**${converted}**`;
				break;

			case 'underline':
				converted = `<u>${converted}</u>`;
				break;

			case 'subsup': {
				const tag = mark.attrs && mark.attrs.type === 'sub' ? 'sub' : 'sup';
				converted = `<${tag}>${converted}</${tag}>`;
				break;
			}

			case 'textColor': {
				const color = (mark.attrs && mark.attrs.color) || '';
				converted = `<span style="color: ${color}">${converted}</span>`;
				break;
			}

			case 'border':
				// visual-only, no markdown equivalent
				break;

			default: // not supported
				ctx.warnings.add(mark.type);
				break;
		}

		return converted;
	}, node.text);
}

Converter.convert = (adf) => {
	const ctx = { warnings: new Set(), attachments: [] };

	Converter.validate(adf);

	return {
		result: _convert(adf, ctx),
		warnings: ctx.warnings,
		attachments: ctx.attachments,
	};
};

Converter.validate = (adf) => {
	// Super naive validation -- someday validate against this: https://unpkg.com/@atlaskit/adf-schema@22.0.1/dist/json-schema/v1/full.json
	let ok = true;

	if (!adf || typeof adf !== 'object') {
		ok = false;
	}

	if (adf.type !== 'doc') {
		ok = false;
	}

	if (adf.version !== 1) {
		ok = false;
	}

	if (!ok) {
		throw new Error('adf-validation-failed');
	}
};
