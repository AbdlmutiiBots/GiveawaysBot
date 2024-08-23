module.exports = {
  name: 'end',
  description: 'End a giveaway',
  permissions: {
    user: ["ADMINSTARTOR"],
    bot: []
  },
  options: [
    {
      type: "INTEGER",
      name: "id",
      min_value: 1,
      description: "The ID of the giveaway",
      required: true
    },
    {
      type: "BOOLEAN",
      name: "force",
      description: "Whether to force end the giveaway or just pick a winner"
    }
  ],
  type: 1,
  parent: 'giveaway',
  async run (lb, bot, db, Discord) {
    const id = lb.options.getInteger("id");
    const force = lb.options.getBoolean("force") ?? true;

    try {
      const giveaway = await getGiveaway(db, id);

      if (!giveaway) {
        return lb.reply({
          content: "Giveaway not found or inactive. Check the ID with /giveaways list.",
          ephemeral: true
        });
      }

      if (force) {
        await endGiveaway(db, bot, giveaway);
      } else {
        await pickWinner(db, bot, giveaway);
      }

      lb.reply({ content: `Processed giveaway ID \`${id}\`.`, ephemeral: true });
    } catch (error) {
      console.error("Error:", error);
    }
  }
};

async function getGiveaway(db, id) {
  const conn = await db.getConnection();
  try {
    const [giveaway] = await conn.query("SELECT * FROM giveaways WHERE id = ? AND active = 1", [id]);
    return giveaway;
  } finally {
    await conn.release();
  }
}

async function endGiveaway(db, bot, giveaway) {
  const conn = await db.getConnection();
  try {
    const channel = bot.channels.cache.get(giveaway.channelid);
    const message = await channel.messages.fetch(giveaway.msgid);

    if (giveaway.participants.length === 0) {
      await message.edit({ content: "No participants", components: [
        new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageButton()
              .setLabel(`${giveaway.participants.length}`)
              .setStyle("SECONDARY")
              .setEmoji("🎉")
              .setCustomId("disabled")
              .setDisabled(true)
          )
      ]});
      await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [giveaway.id]);
    } else {
      const winners = getRandomWinners(giveaway.participants, giveaway.winners);
      const mentions = winners.map(w => `<@${w}>`).join(", ");

      await message.edit({
        content: mentions,
        embeds: [new Discord.MessageEmbed()
          .setTitle(giveaway.name)
          .setColor("BLUE")
          .setTimestamp()
          .setDescription("This giveaway has ended. Winners have been notified.")
        ],
        components: [
          new Discord.MessageActionRow()
            .addComponents(
              new Discord.MessageButton()
                .setLabel(`${giveaway.participants.length}`)
                .setStyle("SECONDARY")
                .setEmoji("🎉")
                .setCustomId("disabled")
                .setDisabled(true)
            )
        ]
      });

      await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [giveaway.id]);
    }
  } finally {
    await conn.release();
  }
}

async function pickWinner(db, bot, giveaway) {
  const channel = bot.channels.cache.get(giveaway.channelid);
  const message = await channel.messages.fetch(giveaway.msgid);

  await message.delete();
  await db.query("DELETE FROM giveaways WHERE id = ?", [giveaway.id]);
}

function getRandomWinners(participants, count) {
  const shuffled = participants.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
