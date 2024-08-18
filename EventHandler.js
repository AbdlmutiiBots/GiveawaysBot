const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");

module.exports = {
  async run(bot, db) {
    const eventsPath = path.join(__dirname, './events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const event = require(path.join(eventsPath, file));
      if (event.once) {
        bot.once(event.name, (...args) => event.run(...args, bot, db));
      } else {
        bot.on(event.name, (...args) => event.run(...args, bot, db));
      }
    }
  }
}

