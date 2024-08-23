const Discord = require("discord.js");
const ms = require("ms");

module.exports = {
  name: 'giveaway',
  description: 'Create a giveaway',
  permissions: {
    bot: [],
    user: []
  },
  cooldown: '5s',
  catg: '',
  options: [
    {
      name: 'create',
      type: 1,
      description: 'Create a giveaway!',
      options: [
        {
          name: "name",
          description: "The giveaway name",
          type: "STRING",
          required: true
        },
        {
          name: "duration",
          description: "The giveaway duration, e.g: 1d, 1w, 2mo",
          type: "STRING",
          required: true
        },
        {
          name: "winners",
          description: "The giveaway winners",
          type: "INTEGER",
          min_value: 1,
          required: true
        },
      ]
    }
  ],
  async run(lb, bot, db) {
    const durationStr = lb.options.getString("duration");

    if (!isValidDuration(durationStr)) {
      return lb.reply({ content: "Invalid duration. Use formats like: `1d`, `2w`, `3mo`, etc.", ephemeral: true });
    }

    const durationSec = calculateDuration(durationStr);
    const giveawayDetails = {
      name: lb.options.getString("name"),
      winners: lb.options.getInteger("winners"),
      durationSec,
      channelId: lb.channel.id
    };

    try {
      const giveawayId = await saveGiveaway(db, giveawayDetails);
      const giveawayMessage = await sendGiveawayMessage(lb, bot, giveawayDetails, giveawayId);
      await updateGiveawayMessageId(db, giveawayId, giveawayMessage.id);

      lb.reply({ content: `Giveaway created. Save this ID: **${giveawayId}**`, ephemeral: true });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }
};

function isValidDuration(durationStr) {
  return /d$|h$|m$|w$|mo$|s$/.test(durationStr);
}

function calculateDuration(durationStr) {
  return Math.floor(Date.now() / 1000) + Math.floor(ms(durationStr) / 1000);
}

async function saveGiveaway(db, details) {
  const conn = await db.getConnection();
  try {
    const result = await conn.query(
      "INSERT INTO giveaways (name, winners, endsat, participants, msgid, channelid) VALUES (?, ?, ?, ?, ?, ?)",
      [details.name, details.winners, details.durationSec, "[]", null, details.channelId]
    );
    return result.insertId;
  } finally {
    await conn.release();
  }
}

async function sendGiveawayMessage(lb, bot, details, giveawayId) {
  const gvEmbed = new Discord.MessageEmbed()
    .setTitle("🎉 " + details.name + " 🎉")
    .setColor(bot.config?.color || "BLURPLE")
    .setFooter(`${details.winners} winner(s)`)
    .setDescription("Click on the button with the 🎉 emoji to participate in this giveaway!\nEnds " + `<t:${details.durationSec}:R>`)
    .setTimestamp();

  const gvButton = new Discord.MessageActionRow()
    .addComponents(
      new Discord.MessageButton()
        .setLabel("0")
        .setStyle("SECONDARY")
        .setEmoji("🎉")
        .setCustomId("btn_" + giveawayId)
    );

  return lb.channel.send({ embeds: [gvEmbed], content: "@everyone A new giveaway!", components: [gvButton] });
}

async function updateGiveawayMessageId(db, giveawayId, messageId) {
  const conn = await db.getConnection();
  try {
    await conn.query("UPDATE giveaways SET msgid = ? WHERE id = ?", [messageId, giveawayId]);
  } finally {
    await conn.release();
  }
}
