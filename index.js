const Discord = require('discord.js');
require("dotenv").config();
const db = require("./db.js");

const bot = new Discord.Client({ intents: 32767 });
bot.config = {};

bot.on('ready', async () => {
    console.log(`󱚣 Logged in as ${bot.user.tag}`);

  let conn = await db.getConnection();
    console.log(`${bot.user.tag} is checking for ended giveaways..`);

    setInterval(async () => {
      let gvs = await conn.query(
        `SELECT * FROM giveaways WHERE endsat <= ? AND active = 1`,
        [Math.floor(Date.now() / 1000)]
      );

      if (gvs.length >= 1) {
        gvs.forEach(async (g) => {
          let winner;
          let arr = g.participants;
          let n = Math.min(Number(g.winners), arr.length);
          let shuffled = arr.slice().sort(() => 0.5 - Math.random());

          if (arr.length <= Number(g.winners)) {
            winner = "Not enough participants";
          } else {
            winner = shuffled.slice(0, n);
          }
          console.log(winner);

           let participantsButton = new Discord.MessageActionRow().addComponents(
              new Discord.MessageButton()
                .setLabel(`${arr.length}`)
                .setStyle("SECONDARY")
                .setEmoji("🎉")
                .setCustomId("disabled")
                .setDisabled(true)
            );

          let msg = await bot.channels.cache
            .get(g.channelid)
            .messages.fetch(g.msgid);
console.log("feh msg")
          if (winner === "Not enough participants") {
          console.log("case 1")
            await msg.edit({ content: winner, embeds: [], components: [participantsButton] });
await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [g.id]);
          } else {
          console.log("case 2")
            let winEmbed = new Discord.MessageEmbed()
            .setTitle(g.name)
            .setColor(bot.config.color || "BLUE")
            .setTimestamp()
            .setDescription("**This givaway has ended, the winners mentioned should reveice their prizes shortly**");

            await msg.edit({
              content: `${winner.map(b => `<@${b}>`).join(", ")}`,
              embeds: [winEmbed],
              components: [participantsButton]
            });
    
          await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [g.id])
          console.log("edited")
          }
          await conn.release();
        });
      }
    }, 10 * 1000);
});

require("./SlashHandler.js").run(bot, db);
require("./EventHandler.js").run(bot, db);
bot.login();
