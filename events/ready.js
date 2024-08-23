const Discord = require('discord.js');
const db = require('../db.js');

module.exports = {
  name: 'ready',
  once: true,
  async run(bot) {
    console.log(`Logged in as ${bot.user.tag}`);
    
    const conn = await db.getConnection();
    console.log(`${bot.user.tag} is checking for ended giveaways...`);

    setInterval(async () => {
      const gvs = await getGiveaways(conn);

      for (const gv of gvs) {
        await processGiveaway(conn, gv, bot);
      }
      
      await conn.release();
    }, 10 * 1000);
  }
};

async function getGiveaways(conn) {
  return conn.query(
    `SELECT * FROM giveaways WHERE endsat <= ? AND active = 1`,
    [Math.floor(Date.now() / 1000)]
  );
}

async function processGiveaway(conn, gv, bot) {
  const wins = getWinners(gv.participants, gv.winners);
  const ch = bot.channels.cache.get(gv.channelid);
  const msg = await ch.messages.fetch(gv.msgid);

  const btn = makeButton(gv.participants.length);

  if (wins.length === 0) {
    await msg.edit({ content: "Not enough participants", components: [btn] });
  } else {
    const winnersText = wins.map(w => `<@${w}>`).join(", ");
    const embed = makeEmbed(gv.name);

    await msg.edit({
      content: winnersText,
      embeds: [embed],
      components: [btn]
    });
  }

  await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [gv.id]);
}

function getWinners(participants, maxWinners) {
  if (participants.length <= maxWinners) return [];

  const shuffled = participants.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(maxWinners, shuffled.length));
}

function makeButton(count) {
  return new Discord.MessageActionRow().addComponents(
    new Discord.MessageButton()
      .setLabel(`${count}`)
      .setStyle("SECONDARY")
      .setEmoji("🎉")
      .setCustomId("disabled")
      .setDisabled(true)
  );
}

function makeEmbed(name) {
  return new Discord.MessageEmbed()
    .setTitle(name)
    .setColor("BLUE")
    .setTimestamp()
    .setDescription("**This giveaway has ended, the winners mentioned should receive their prizes shortly**");
}
      
