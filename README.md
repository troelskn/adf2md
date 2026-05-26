# adf2md

Convert Atlassian Document Format (ADF) — the JSON shape used by Jira and
Confluence for rich-text fields — to Markdown.

The CLI accepts either a full Jira issue payload (in which case it reads
`fields.summary`, `fields.description`, and `fields.comment.comments[]`)
or a bare ADF document, and writes Markdown to stdout.

## Build

Sources live in [`lib/`](lib). A small build script
([`build.js`](build.js)) inlines them into a single self-contained
executable at `bin/adf2md`:

    npm run build

After building, `bin/adf2md` works on any host with a Node runtime —
copy it around freely. `npm install -g .` exposes it on `$PATH` as
`adf2md`.

During development, before building, you can also run the entry script
directly:

    node lib/main.js path/to/ticket.json

## Usage

Read from a file:

    adf2md path/to/ticket.json

Read from stdin (no arg, or explicit `-`):

    cat ticket.json | adf2md
    cat ticket.json | adf2md -

## Fetching from Jira with `acli`

[`acli`](https://developer.atlassian.com/cloud/acli/) is Atlassian's
official command-line tool. Once authenticated to your Jira site
(`acli auth login`), you can fetch a ticket and pipe it straight in:

    acli jira workitem view BM-4649 --fields "summary,description,comment" --json | adf2md

Or stage the JSON for inspection first:

    acli jira workitem view BM-4649 --fields "summary,description,comment" --json > ticket.json
    adf2md ticket.json

### Choosing `--fields`

The `view` command's default field set is
`key,issuetype,summary,status,assignee,description` — **`comment` is
not included by default.** To get comments rendered alongside the
description, list them explicitly:

| Goal                                  | `--fields` value                  |
| ------------------------------------- | --------------------------------- |
| Just the description (default)        | _omit the flag_                   |
| Description + comments (recommended)  | `summary,description,comment`     |
| Everything Jira returns               | `*all`                            |

`*all` works but pads the payload with metadata that `adf2md` never
reads (`assignee`, `issuetype`, `status`, custom fields, attachments,
watchers, …). On a typical ticket the lean field set produces a
~20%-smaller payload and byte-identical Markdown output.

The `--json` flag is required — without it `acli` prints a human
table instead of the API payload shape.

## Input shape

The CLI auto-detects what it's given:

- A full Jira issue payload (object with `fields.description`) renders
  the summary as `# H1`, then the description, then any comments as a
  `## Comments` section with `### <Author> — <YYYY-MM-DD>` per entry.
- A bare ADF document (`{type: "doc", version: 1, content: [...]}`) is
  converted as-is with no preamble.

Unsupported ADF node or mark types are reported on stderr as warnings;
they don't fail the conversion.

## Acknowledgement

This code started out as a copy of [julianlam/adf-to-md](https://github.com/julianlam/adf-to-md)
