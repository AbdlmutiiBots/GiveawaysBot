const Discord = require('discord.js');
require('dotenv').config();
const db = require('./db.js');

const bot = new Discord.Client({ intents: 32767 });
bot.config = {};

bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  
  const conn = await db.getConnection();
  console.log(`${bot.user.tag} is checking for ended giveaways...`);

  setInterval(async () => {
    const giveaways = await getEndedGiveaways(conn);

    for (const giveaway of giveaways) {
      await handleGiveaway(conn, giveaway);
    }

    await conn.release();
  }, 10 * 1000);
});

async function getEndedGiveaways(conn) {
  return conn.query(
    `SELECT * FROM giveaways WHERE endsat <= ? AND active = 1`,
    [Math.floor(Date.now() / 1000)]
  );
}

async function handleGiveaway(conn, giveaway) {
  const winners = determineWinners(giveaway.participants, giveaway.winners);
  const channel = bot.channels.cache.get(giveaway.channelid);
  const message = await channel.messages.fetch(giveaway.msgid);

  const participantsButton = createParticipantsButton(giveaway.participants.length);

  if (winners.length === 0) {
    await message.edit({ content: "Not enough participants", components: [participantsButton] });
  } else {
    const winnersList = winners.map(w => `<@${w}>`).join(", ");
    const embed = createWinnersEmbed(giveaway.name);

    await message.edit({
      content: winnersList,
      embeds: [embed],
      components: [participantsButton]
    });
  }

  await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [giveaway.id]);
}

function determineWinners(participants, maxWinners) {
  if (participants.length <= maxWinners) return [];

  const shuffled = participants.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(maxWinners, shuffled.length));
}

function createParticipantsButton(count) {
  return new Discord.MessageActionRow().addComponents(
    new Discord.MessageButton()
      .setLabel(`${count}`)
      .setStyle("SECONDARY")
      .setEmoji("🎉")
      .setCustomId("disabled")
      .setDisabled(true)
  );
}

function createWinnersEmbed(name) {
  return new Discord.MessageEmbed()
    .setTitle(name)
    .setColor(bot.config.color || "BLUE")
    .setTimestamp()
    .setDescription("**This giveaway has ended, the winners mentioned should receive their prizes shortly**");
}

require('./SlashHandler.js').run(bot, db);
require('./EventHandler.js').run(bot, db);
bot.login();
