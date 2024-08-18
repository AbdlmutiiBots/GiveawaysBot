module.exports = {
  name: 'end',
  description: 'End a giveaway',
  options: [
    {
      type: "INTEGER",
      name: "id",
      min_value: 1,
      max_length: 2,
      description: "The id of the giveaway",
      required: true
    },
    {
      type: "BOOLEAN",
      name: "force",
      description: "Wheather to terminate the giveaway or just pick a winnner."
    }
  ],
  type: 1,
  parent: 'giveaway',
  run: async (lb, bot, db, Discord) => {
    let conn = await db.getConnection();
    try {
    let force = true;
    if(!lb.options.getBoolean("force") || lb.options.getBoolean("force") === false) force = false;
console.log(force)
    let [g] = await conn.query("SELECT * FROM giveaways WHERE id = ? AND active = 1", [lb.options.getInteger("id")]);
    if(!g) return lb.reply({content: "No data about this giveaway, do /giveaways list to get the giveaway id, it may also mean that the giveaway isn't active anymore.", ephemeral: true});
lb.reply({content: "Ended the giveaway with the id `" + g.id + "`", ephemeral: true});
    // End 'giveaway'
    if(force === false) {
          let winner;
          let arr = g.participants;
          let n = Math.min(Number(g.winners), arr.length);
          let shuffled = arr.slice().sort(() => 0.5 - Math.random());

          if (arr.length <= Number(g.winners)) {
            winner = "Not enough participants";
          } else {
            winner = shuffled.slice(0, n);
          }
          
           let participantsButton = new Discord.MessageActionRow().addComponents(
              new Discord.MessageButton()
                .setLabel(`${arr.length}`)
                .setStyle("SECONDARY")
                .setEmoji("🎉")
            .setCustomId("diasbled")
                .setDisabled(true)
            );

          let msg = await bot.channels.cache
            .get(g.channelid)
            .messages.fetch(g.msgid);
console.log(winner)
          if (winner === "Not enough participants") {
            await msg.edit({ content: winner, embeds: [], components: [participantsButton] });
          await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [g.id]);
          } else {
            let winEmbed = new Discord.MessageEmbed()
            .setTitle(g.name)
            .setColor(bot.config?.color || "BLUE")
            .setTimestamp()
            .setDescription("**This givaway has ended, the winners mentioned should reveice their prizes shortly**");

            await msg.edit({
              content: `${winner.map(b => `<@${b}>`).join(", ")}`,
              embeds: [winEmbed],
              components: [participantsButton]
            });
          await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [g.id]);

          console.log("message edited");
          }
    } else {
      let msg =  await bot.channels.cache
            .get(g.channelid)
            .messages.fetch(g.msgid);

      await msg.delete()
        //await conn.query("UPDATE giveaways SET active = 0 WHERE id = ?", [g.id]);
      await conn.query("DELETE FROM giveaways WHERE id = ?", [g.id]);
    }
    } catch(err) {
      console.log(err);
    } finally {
    await conn.release()
    }
  }
};
