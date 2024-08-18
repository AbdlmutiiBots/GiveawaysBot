const Discord = require("discord.js");
const db = require("../db.js");

module.exports = {
  name: 'interactionCreate',
  once: false,
  run: async (i) => {
    if (i.isButton() && i.customId.startsWith("btn_")) {
      const conn = await db.getConnection();
      try {
        const id = i.customId.replace("btn_", "");
        
        const [result] = await conn.query("SELECT participants FROM giveaways WHERE id = ?", [id]);
        console.log(result)
        let participants = result.participants
        
        if (!participants.includes(i.user.id) || participants.length < 1) {
          participants.push(i.user.id);
          
          await conn.query("UPDATE giveaways SET participants = ? WHERE id = ?", [JSON.stringify(participants), id]);
          
          const gvButton = new Discord.MessageActionRow()
            .addComponents(
              new Discord.MessageButton()
                .setLabel(String(participants.length))
                .setStyle("SECONDARY")
                .setEmoji("🎉")
                .setCustomId("btn_" + id)
            );
          
          await i.update({ components: [gvButton] });
        } else {
          await i.reply({ content: "You are already participating!", ephemeral: true });
        }
      } finally {
        conn.release();
      }
    }
  }
};

