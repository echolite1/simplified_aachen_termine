require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Dear User, this bot can help you get the appointment.'));

// bot.on('message', async (ctx) => {
//     console.log(ctx.chat.id);
//     ctx.reply(""+ctx.chat.id);
// });
// bot.on('message', async (ctx) => {
//     const response = 'Bruh. Better type in something smart:/';
//     // const response = 'Scan started. Available appointments:';
//     var currentUser = "" + ctx.chat.id;
//     // findAppointment(bot, currentUser, externalPersonType);
//     ctx.reply(`${response}`);
// });
bot.command('regular', (ctx) => {
    var minutes = 2, the_interval = minutes * 60 * 1000;
    setInterval(function() {
        ctx.reply('Hi resident of Aachen!');
        console.log(ctx.chat.id);
    }, the_interval);
    ctx.reply('Outside!'); // executed 30 sec before
});

bot.launch();
