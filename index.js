const Discord = require('discord.js');
require('dotenv').config();
const db = require('./db.js');

const bot = new Discord.Client({ intents: 32767 });
bot.config = {};

bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}`);
});

require('./SlashHandler.js').run(bot, db);
require('./EventHandler.js').run(bot, db);
bot.login();
