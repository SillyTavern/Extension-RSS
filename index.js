import { extension_settings } from '../../../extensions.js';
import { isTrueBoolean, isFalseBoolean } from '../../../utils.js';
import { saveSettingsDebounced } from '../../../../script.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandClosure } from '../../../slash-commands/SlashCommandClosure.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommandScope } from '../../../slash-commands/SlashCommandScope.js';

const defaultSettings = {
    corsProxy: 'https://cors-anywhere.herokuapp.com/',
    rssFeeds: [],
};

async function getNewsCallback(args, value) {
    return '';
}

jQuery(() => {
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
                    <small>To use a built-in proxy, enable it in <code>config.yaml</code> and leave this field empty.</small>
                    <input id="rss_cors_proxy" class="text_pole" type="text" />
                </div>
                <div>
                    <label for="rss_feeds">RSS Feeds (one per line)</label>
                    <textarea id="rss_feeds" class="text_pole" rows="4"></textarea>
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

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'news',
        helpString: 'Get the latest news from RSS feeds.',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'filter news items by category',
                isRequired: false,
                acceptsMultiple: false,
                defaultValue: '',
                typeList: [ARGUMENT_TYPE.STRING],
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
        ],
        callback: getNewsCallback,
        returns: 'a string containing the latest news items',
    }));
});