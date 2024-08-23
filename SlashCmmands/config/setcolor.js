const Discord = require("discord.js");

module.exports = {
  name: 'setcolor',
  description: 'Set the embed colors',
  permissions: {
    bot: [],
    user: ["ADMINSTARTOR"]
  },
  cooldown: '5s',
  catg: '',
  options: [
    {
      name: 'color',
      type: "STRING",
      description: 'The color to use',
      required: true
    }
  ],
  async run(lb, bot, db) {
    let c = lb.options.getString('color'); 
    let hex = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/;
    if(!hex.test(c)) return lb.reply({content: "Invalid hex code", ephemeral: true});

let embed = new Discord.MessageEmbed()
    .setTitle("Example color")
    .setDescription("Lorem ipsum dolor sit amet, qui minim labore adipisicing minim sint cillum sint consectetur cupidatat.")
    .setTimestamp()
    .setColor(c);

    bot.config.color = c;
    lb.reply({content: "Changed embed color to this:", ephemeral: true, embeds: [embed]})
  }
}

