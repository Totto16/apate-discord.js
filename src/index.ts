import { Client, Intents, Message } from 'discord.js';

import log4js, { Logger } from 'log4js';

import StegCloak from 'stegcloak';
/* import cryptico from 'cryptico'; */

let logger: Logger | null = null;

async function start(options: PluginOptions): Promise<ModifiedClient | null> {
    if (options.debug === true) {
        if (typeof options.loggerConfig !== 'undefined') {
            log4js.configure(options.loggerConfig);
        }
        logger = log4js.getLogger();
    }
    const result: ModifiedClient | null = await main(options);
    return result;
}

function log(level: LogLevel, ...messages: unknown[]) {
    if (logger) {
        for (let i = 0; i < messages.length; i++) {
            //quick and dirty calling of the functions
            // eslint-disable-next-line security/detect-object-injection
            logger[level](messages[i]);
        }
    }
}

async function main(options: PluginOptions): Promise<ModifiedClient | null> {
    return new Promise((resolve) => {
        //TODO: update required intents!!
        const client: Client | null = new Client({
            partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
            allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MEMBERS,
                Intents.FLAGS.GUILD_PRESENCES,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.DIRECT_MESSAGES,
            ],
        });
        client.on('ready', () => {
            client.on('messageCreate', (message: Message) => {
                log('info', 'message: ', escape(message.content));
                const response: DecryptedMessage | null = checkMessage(message, options);
                if (response !== null) {
                    (message as apateMessage).apate = response;
                    (client as ModifiedClient).emit('parsedApateMessage', message as apateMessage);
                }
            });

            log('info', `${client.user?.username ?? 'Error'} started.`);
            (client as ModifiedClient).usingApate = true;
            resolve(client as ModifiedClient);
        });

        // better then await in "async" Promise:  new Promise(async () => ...
        // eslint-disable-next-line github/no-then
        client.login(options.token).catch((error) => {
            log('error', 'ERROR in client login:', error);
            resolve(null);
        });
    });
}

function checkMessage(message: Message, options: PluginOptions): DecryptedMessage | null {
    const matcher = /.*(\u200B.*)/.exec(message.content);
    if (matcher !== null) {
        if (matcher.index !== 0) {
            const error = "You managed it, to smuggel the indicating character into somewhere, it doesn't belong!";
            log('warn', error);
            return { error };
        }
        return extractMessage(message.content.substring(matcher.index + 1), options);
    }
    return null;
}

// here comes the intersting part, used from: https://github.com/TheGreenPig/Apate/blob/main/Apate.plugin.js))

function extractMessage(message: string, options: PluginOptions): DecryptedMessage | null {
    let usedPassword = '';
    const hiddenMessage: string | null = (() => {
        try {
            const stegCloak: StegCloak = new StegCloak(false, false); // I think its false, cause in the original its using implicitely undefined
            let revealedMessage: string;
            revealedMessage = stegCloak.reveal(
                message,
                message.replace(message.replace(/[\u200C\u200D\u2061\u2062\u2063\u2064]*/, ''), '')
            );

            //check no password
            if (revealedMessage.endsWith('\u200b')) {
                //has indicator character
                return revealedMessage.slice(0, -1);
            }

            //check all other passwords
            for (let i = 0; i < options.passwordList.length; i++) {
                revealedMessage = stegCloak.reveal(message, options.passwordList[i]);
                if (revealedMessage.endsWith('\u200b')) {
                    //has indicator character
                    usedPassword = options.passwordList[i];
                    return revealedMessage.slice(0, -1);
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    })();

    if (hiddenMessage !== null) {
        return {
            decrypted: {
                normalPart: '',
                hiddenPart: hiddenMessage,
                usedPassword,
                e2e: false,
            },
        };
    }

    return null;
}

export type LogLevel = 'info' | 'debug' | 'error' | 'warn' | 'fatal' | 'log' | 'trace';

export interface DecryptedMessage {
    error?: string | Error;
    decrypted?: {
        normalPart: string;
        hiddenPart: string;
        usedPassword: string;
        e2e: boolean;
    };
}

export interface ModifiedClient extends Client {
    usingApate: boolean;
}

export interface apateMessage extends Message {
    apate: DecryptedMessage;
}

export interface PluginOptions {
    token: string;
    debug?: boolean;
    passwordList: string[];
    loggerConfig?: log4js.Configuration;
}

export default start;
