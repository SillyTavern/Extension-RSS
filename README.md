# Extension-RSS

Adds a slash command that returns the latest news from RSS feeds.

Includes a copy of the [rss-parser](https://github.com/rbren/rss-parser) library (MIT license).

## Installation

Install using the SillyTavern extension installer

```txt
https://github.com/SillyTavern/Extension-RSS
```

## Usage

1. Requires a CORS proxy to function! Either set enableCorsProxy to true in `config.yaml` and leave the UI field empty or use a CORS proxy like `https://cors-anywhere.herokuapp.com/` in the "CORS Proxy" field in the extension settings.
2. Add RSS feeds in the extension settings, one per line.
3. Use the `/news` command to get the latest news from the feeds.

## Arguments

`/news <feeds>` - Get the latest news from the feeds. Alias: `/rss`

- `feeds` - Feeds to get the news from (accepts multiple, space delimited). If not provided, the news from all feeds configured in the settings will be returned.
- `count` - The number of news items to return. The default is 5.
- `title` - Include the title of the news item. The default is true.
- `snippet` - Include a snippet of the news item. The default is true.
- `link` - Include the link to the news item. The default is false.
- `date` - Include the date of the news item. The default is false.

## Example

```txt
/news count=5 title=true snippet=true https://www.reddit.com/r/news/.rss https://www.reddit.com/r/worldnews/.rss
```

## License

AGPL-3.0
