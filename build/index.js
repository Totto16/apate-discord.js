import { Client, Intents } from 'discord.js';
import log4js from 'log4js';
import StegCloak from 'stegcloak';
/* import cryptico from 'cryptico'; */
let logger = null;
async function start(options) {
    if (options.debug === true) {
        if (typeof options.loggerConfig !== 'undefined') {
            log4js.configure(options.loggerConfig);
        }
        logger = log4js.getLogger();
    }
    const result = await main(options);
    return result;
}
function log(level, ...messages) {
    if (logger) {
        for (let i = 0; i < messages.length; i++) {
            //quick and dirty calling of the functions
            // eslint-disable-next-line security/detect-object-injection
            logger[level](messages[i]);
        }
    }
}
async function main(options) {
    return new Promise((resolve) => {
        //TODO update required intents!!
        const client = new Client({
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
            client.on('messageCreate', (message) => {
                log('info', 'message: ', escape(message.content));
                const response = checkMessage(message, options);
                if (response !== null) {
                    message.apate = {
                        decryptet: response,
                    };
                    client.emit('parsedApateMessage', message);
                }
            });
            log('info', `${client.user?.username ?? 'Error'} started.`);
            client.usingApate = true;
            resolve(client);
        });
        // better then await in "async" Promise:  new Promise(async () => ...
        // eslint-disable-next-line github/no-then
        client.login(options.token).catch((error) => {
            log('error', 'ERROR in client login:', error);
            resolve(null);
        });
    });
}
function checkMessage(message, options) {
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
function extractMessage(message, options) {
    let usedPassword = '';
    const hiddenMessage = (() => {
        try {
            const stegCloak = new StegCloak(false, false); // I think its fdalöse, cause in the originmal its using implizitely undefined
            let revealedMessage;
            revealedMessage = stegCloak.reveal(message, message.replace(message.replace(/[\u200C\u200D\u2061\u2062\u2063\u2064]*/, ''), ''));
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
        }
        catch (error) {
            return 'hello from catch';
        }
        return 'test';
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
export default start;
