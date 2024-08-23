const Discord = require("discord.js");
const ms = require("ms");

module.exports = {
  name: 'giveaway',
  description: 'Create a giveaway',
  permissions: {
    bot: [],
    user: ["ADMINSTARTOR"]
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
    if (!/d$|h$|m$|w$|mo$|s$/.test(durationStr)) {
      return lb.reply({ content: "Invalid duration. Use formats like: `1d`, `2w`, `3mo`, etc.", ephemeral: true });
    }

    const durationSec = Math.floor(Date.now() / 1000) + Math.floor(ms(durationStr) / 1000);

    const conn = await db.getConnection();

    try {
      const result = await conn.query(
        "INSERT INTO giveaways (name, winners, endsat, participants, msgid, channelid) VALUES (?, ?, ?, ?, ?, ?)",
        [lb.options.getString("name"), lb.options.getInteger("winners"), durationSec, "[]", null, lb.channel.id]
      );

      let gvEmbed = new Discord.MessageEmbed()
        .setTitle("🎉 " + lb.options.getString("name") + " 🎉")
        .setColor(bot.config?.color || "BLURPLE")
        .setFooter(`${lb.options.getInteger("winners")} winner(s)`)
        .setDescription("Click on the button with the 🎉 emoji to participate in this giveaway!\nEnds " + `<t:${durationSec}:R>`)
        .setTimestamp();

      let gvButton = new Discord.MessageActionRow()
        .addComponents(
          new Discord.MessageButton()
            .setLabel("0")
            .setStyle("SECONDARY")
            .setEmoji("🎉")
            .setCustomId("btn_" + result.insertId)
        );

      let msg = await lb.channel.send({ embeds: [gvEmbed], content: "@everyone A new giveaway!", components: [gvButton] });

      await conn.query(
        "UPDATE giveaways SET msgid = ? WHERE id = ?",
        [msg.id, result.insertId]
      );

      lb.reply({ content: `Giveaway created. Save this ID: **${result.insertId}**`, ephemeral: true });

    } catch (error) {
      console.error("An error occurred:", error);
    } finally {
      await conn.release();
    }
  }
};
