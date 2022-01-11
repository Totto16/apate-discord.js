import start from './build/index.js';
//const start = require('./build/index.js');

//const token = import('./config.json')
import data from './config.js';

const loggerConfig = {
    appenders: {
        out: {
            type: 'stdout',
            layout: {
                type: 'pattern',
                pattern: '%[%-5p%] %m',
            },
        },
    },
    categories: {
        default: {
            appenders: ['out'],
            level: 'debug',
        },
    },
};

let modifiedClient = await start({
    debug: true,
    token: data.BOT_TOKEN,
    loggerConfig,
    passwordList: data.PASSWORD_LIST,
});

modifiedClient.on('parsedApateMessage', (message) => {
    console.log('parsed apate message:', message.apate);
});
