import { extension_settings } from '../../../extensions.js';
import { isTrueBoolean, isFalseBoolean, loadFileToDocument, isValidUrl } from '../../../utils.js';
import { saveSettingsDebounced } from '../../../../script.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandEnumValue } from '../../../slash-commands/SlashCommandEnumValue.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';

await loadFileToDocument('scripts/extensions/third-party/Extension-RSS/rss-parser.min.js', 'js');

if (!('RSSParser' in window)) {
    throw new Error('RSSParser not found.');
}

const defaultSettings = {
    corsProxy: 'https://cors-anywhere.herokuapp.com/',
    rssFeeds: [],
};

async function getNewsCallback(args, value) {
    const urls = [];

    if (value.trim()) {
        urls.push(...value.split(' ').map(x => x.trim()).filter(x => x));
    } else {
        urls.push(...extension_settings.rss.rssFeeds);
    }

    if (urls.length === 0) {
        toastr.warning('No RSS feeds configured.');
        return '';
    }

    const parser = new RSSParser();
    const feeds = urls.map(feed => getCorsProxy() + feed);
    const promises = feeds.map(feed => parser.parseURL(feed));
    const parsedFeeds = (await Promise.allSettled(promises)).filter(x => x.status === 'fulfilled').map(x => x.value);

    const count = Number(args.count || 5);
    const news = parsedFeeds.flatMap(feed => feed.items).sort((a, b) => new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate)).slice(0, count);

    const title = !isFalseBoolean(args.title);
    const snippet = !isFalseBoolean(args.snippet);
    const link = isTrueBoolean(args.link);
    const date = isTrueBoolean(args.date);

    const result = news.map(item => {
        let str = '';
        if (title) {
            str += `**${item.title}**\n`;
        }
        if (snippet) {
            str += `${item.contentSnippet}\n`;
        }
        if (link) {
            str += `${item.link}\n`;
        }
        if (date) {
            str += `${new Date(item.isoDate || item.pubDate).toLocaleString()}\n`;
        }
        return str;
    }).join('\n').trim();

    return result;
}

function getCorsProxy() {
    const addSlash = (url) => url.endsWith('/') ? url : url + '/';

    if (extension_settings.rss.corsProxy) {
        return addSlash(extension_settings.rss.corsProxy);
    }

    return addSlash(window.location.origin + '/proxy');
}

function registerFunctionTools() {
    try {
        const { registerFunctionTool, unregisterFunctionTool } = SillyTavern.getContext();

        if (!registerFunctionTool) {
            console.debug('[RSS] Tool calling is not supported.');
            return;
        }

        if (!extension_settings.rss.functionTool) {
            unregisterFunctionTool('GetNews');
            return;
        }

        const getNewsSchema = Object.freeze({
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
                count: {
                    type: 'number',
                    description: 'Number of news items to return.',
                },
                feeds: {
                    type: 'array',
                    description: 'RSS feeds to get news from. Get news from all configured feeds if not provided.',
                    items: {
                        type: 'string',
                    },
                },
            },
            required: [
                'count',
            ],
        });

        registerFunctionTool({
            name: 'GetNews',
            displayName: 'Get News',
            description: 'Get the latest news headlines. Call when the user asks for news, what is happening in the world, etc.',
            parameters: getNewsSchema,
            action: async (args) => {
                if (!args) args = { feeds: [], count: 5 };
                if (Array.isArray(args.feeds)) args.feeds = args.feeds.filter(isValidUrl);
                const urls = Array.isArray(args.feeds) && args.feeds.length ? args.feeds : extension_settings.rss.rssFeeds;
                if (urls.length === 0) throw new Error('No RSS feeds provided.');
                const parser = new RSSParser();
                const feeds = urls.map(feed => getCorsProxy() + feed);
                const promises = feeds.map(feed => parser.parseURL(feed));
                const parsedFeeds = (await Promise.allSettled(promises)).filter(x => x.status === 'fulfilled').map(x => x.value);
                if (!parsedFeeds.length) throw new Error('Failed to fetch RSS feeds.');
                const count = Number(args.count || 5);
                const news = parsedFeeds.flatMap(feed => feed.items).sort((a, b) => new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate)).slice(0, count);
                const result = news.map(item => [item.title, item.contentSnippet, item.link, new Date(item.isoDate || item.pubDate).toLocaleString()].join('\n')).join('\n\n').trim();
                return result;
            },
            formatMessage: () => `Getting the latest news...`,
        });
    } catch (err) {
        console.error('RSS function tools failed to register:', err);
    }
}

jQuery(async () => {
    if (extension_settings.rss === undefined) {
        extension_settings.rss = defaultSettings;
    }

    for (const key in defaultSettings) {
        if (extension_settings.rss[key] === undefined) {
            extension_settings.rss[key] = defaultSettings[key];
        }
    }

    const html = `
    <div class="rss_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>RSS</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div>
                    <label for="rss_cors_proxy">CORS Proxy URL</label>
                    <div><small>To use a built-in proxy, enable it in <code>config.yaml</code> and leave this field empty.</small></div>
                    <input id="rss_cors_proxy" class="text_pole" type="text" placeholder="${window.location.origin}/proxy" />
                </div>
                <div>
                    <label for="rss_feeds">RSS Feeds (one per line)</label>
                    <textarea id="rss_feeds" class="text_pole" rows="4"></textarea>
                </div>
                <div>
                    <label class="checkbox_label for="rss_function_tool">
                        <input id="rss_function_tool" type="checkbox" />
                        <span>Use function tool</span>
                        <a rel="noopener" href="https://docs.sillytavern.app/for-contributors/function-calling/" class="notes-link" target="_blank">
                            <span class="note-link-span">?</span>
                        </a>
                    </label>
                </div>
            </div>
        </div>
    </div>`;
    $('#extensions_settings').append(html);

    $('#rss_cors_proxy').val(extension_settings.rss.corsProxy).on('input', function () {
        extension_settings.rss.corsProxy = String($(this).val());
        saveSettingsDebounced();
    });

    $('#rss_feeds').val(extension_settings.rss.rssFeeds.join('\n')).on('input', function () {
        extension_settings.rss.rssFeeds = String($(this).val()).split('\n').map(x => x.trim()).filter(x => x);
        saveSettingsDebounced();
    });

    $('#rss_function_tool').prop('checked', extension_settings.rss.functionTool).on('change', function () {
        extension_settings.rss.functionTool = !!$(this).prop('checked');
        saveSettingsDebounced();
        registerFunctionTools();
    });

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'news',
        aliases: ['rss'],
        helpString: 'Get the latest news from RSS feeds.',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'feeds to get news from',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
                acceptsMultiple: true,
                defaultValue: '',
                enumProvider: () => extension_settings.rss.rssFeeds.map(feed => new SlashCommandEnumValue(feed)),
            }),
        ],
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'count',
                description: 'number of news items to return',
                typeList: [ARGUMENT_TYPE.NUMBER],
                isRequired: false,
                acceptsMultiple: false,
                defaultValue: 5,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'title',
                description: 'include title of the news item',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                isRequired: false,
                acceptsMultiple: false,
                defaultValue: true,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'snippet',
                description: 'include snippet of the news item',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                isRequired: false,
                acceptsMultiple: false,
                defaultValue: true,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'link',
                description: 'include link to the news item',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                isRequired: false,
                acceptsMultiple: false,
                defaultValue: false,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'date',
                description: 'include date of the news item',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                isRequired: false,
                acceptsMultiple: false,
                defaultValue: false,
            }),
        ],
        callback: getNewsCallback,
        returns: 'a string containing the latest news items',
    }));

    registerFunctionTools();
});
