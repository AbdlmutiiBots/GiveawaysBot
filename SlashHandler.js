const prettyMilliseconds = require("pretty-ms");
const ms = require("ms");
const fs = require("fs");
const Discord = require("discord.js");

module.exports = {
  async run(bot, db) {
    bot.slash = new Discord.Collection();
    bot.cooldown = new Discord.Collection();
    let arraySC = [];

    const folders = fs.readdirSync('./SlashCommands');
    for (const folder of folders) {
      const files = fs.readdirSync(`./SlashCommands/${folder}`).filter(file => file.endsWith('.js'));
      for (const file of files) {
        const command = require(`./SlashCommands/${folder}/${file}`);
        bot.slash.set(command.name, command);
        arraySC.push(command);
      }
    }

    arraySC.forEach(cmd => {
      if (cmd.type === 1 && cmd.parent) {
        const parentCmd = bot.slash.get(cmd.parent);
        if (parentCmd) {
          if (!parentCmd.options) parentCmd.options = [];
          if (!cmd.options) cmd.options = [];
          parentCmd.options.push({
            name: cmd.name,
            description: cmd.description,
            type: 1,
            options: cmd.options,
            run: cmd.run
          });
          arraySC = arraySC.filter(c => c.name !== cmd.name);
        }
      }
    });

    bot.on("ready", () => {
      bot.application?.commands.set(arraySC.filter(cmd => !cmd.parent));
      console.log('Slash commands loaded successfully.');
    });

    bot.on('interactionCreate', async lb => {
      if (!lb.isCommand()) return;

      const command = bot.slash.get(lb.commandName);
      if (!command) return;

      let cmdToRun = command;
      const subCommandName = lb.options.getSubcommand(false);
      if (subCommandName) {
        const subCommand = command.options.find(opt => opt.name === subCommandName);
        if (subCommand && subCommand.run) {
          cmdToRun = subCommand;
        }
      }

      try {
        const permissions = command.permissions || {};
        if (permissions.bot?.length) {
          const botPerms = lb.channel.permissionsFor(lb.guild.members.me);
          if (!botPerms || !permissions.bot.every(p => botPerms.has(p))) {
            const missingPerms = permissions.bot.filter(p => !botPerms.has(p));
            return lb.reply({
              content: `Bot can't execute this command without \`${missingPerms.join('`, `')}\` permission(s)`,
              ephemeral: true
            });
          }
        }

        if (permissions.user?.length) {
          const userPerms = lb.channel.permissionsFor(lb.user);
          if (!userPerms || !permissions.user.every(p => userPerms.has(p))) {
            const missingPerms = permissions.user.filter(p => !userPerms.has(p));
            return lb.reply({
              content: `You don't have \`${missingPerms.join('`, `')}\` permission(s)`,
              ephemeral: true
            });
          }
        }

        if (!bot.cooldown.has(command.name)) {
          bot.cooldown.set(command.name, new Discord.Collection());
        }

        const now = Date.now();
        const timestamps = bot.cooldown.get(command.name);
        const cooldownAmount = ms(command.cooldown || '0s');

        if (timestamps.has(lb.user.id)) {
          const expirationTime = timestamps.get(lb.user.id) + cooldownAmount;
          if (now < expirationTime) {
            const timeLeft = expirationTime - now;
            return lb.reply({
              content: `You are on cooldown for ${prettyMilliseconds(timeLeft, { verbose: true })}`,
              ephemeral: true
            });
          }
        }

        timestamps.set(lb.user.id, now);
        setTimeout(() => timestamps.delete(lb.user.id), cooldownAmount);

        await cmdToRun.run(lb, bot, db, Discord);

      } catch (error) {
        console.error(error);
        await lb.reply({
          content: `Encountered an error, Please try again later`,
          ephemeral: true
        });
      }
    });
  }
};

