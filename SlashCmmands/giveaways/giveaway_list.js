const Discord = require("discord.js");
const ms = require("ms");

module.exports = {
  name: 'giveaways',
  description: 'Lists all giveaways',
  permissions: {
    bot: [],
    user: ["ADMINSTARTOR"]
  },
  cooldown: '5s',
  catg: '',
  options: [
    {
      name: 'list',
      type: 1,
      description: 'List all giveaways',
    }
  ],
  async run(lba, bot, db) {
    let conn = await db.getConnection();
    let giveaways = await conn.query(`SELECT id, name, endsat FROM giveaways`);

    let pages = [];
    let maxPerPage = 5;
    
    while (giveaways.length) {
      pages.push(giveaways.splice(0, maxPerPage));
    }

    let embed = (p) => new Discord.MessageEmbed()
      .setTitle('Giveaways')
      .setColor(bot?.config?.color || 'BLUE')
      .setDescription(p.map(g => {
        let status = g.endsat <= Math.floor(Date.now() / 1000) ? 'Ended' : 'Ongoing';
        return `**${g.name}** - ID: ${g.id} - Status: ${status}`;
      }).join("\n"));

    let curPage = 0;
    let curEmbed = embed(pages[curPage]);

    let buttons = new Discord.MessageActionRow()
      .addComponents(
        new Discord.MessageButton()
          .setCustomId('prev')
          .setLabel('◀️')
          .setStyle('SECONDARY')
          .setDisabled(curPage === 0),
        new Discord.MessageButton()
          .setCustomId('next')
          .setLabel('▶️')
          .setStyle('SECONDARY')
          .setDisabled(curPage === pages.length - 1)
      );

    let msg = await lba.reply({ embeds: [curEmbed], components: [buttons], fetchReply: true });

    const filter = i => ['prev', 'next'].includes(i.customId) && i.user.id === lba.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: ms('2m') });

    collector.on('collect', async i => {
      if (i.customId === 'prev' && curPage > 0) curPage--;
      else if (i.customId === 'next' && curPage < pages.length - 1) curPage++;

      let newEmbed = embed(pages[curPage]);
      let newButtons = new Discord.MessageActionRow()
        .addComponents(
          new Discord.MessageButton()
            .setCustomId('prev')
            .setLabel('◀️')
            .setStyle('SECONDARY')
            .setDisabled(curPage === 0),
          new Discord.MessageButton()
            .setCustomId('next')
            .setLabel('▶️')
            .setStyle('SECONDARY')
            .setDisabled(curPage === pages.length - 1)
        );

      await i.update({ embeds: [newEmbed], components: [newButtons] });
    });

    collector.on('end', () => msg.edit({ components: [] }));
  }
};

