const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');


const TOKEN = 'your bot token';

const SERVER_IP = 'server ip';

const CHANNEL_ID = 'channel id';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let statusMessageId = null; 


async function getMinecraftServerStatus() {
    try {
        const response = await axios.get(`https://api.mcsrvstat.us/3/${SERVER_IP}`);
        const { online, players, motd, version } = response.data;

        let playerList = players.list ? players.list.join(', ') : 'No players online';

        
        const nextUpdateTime = Math.floor((Date.now() + 5 * 60 * 1000) / 1000); 

        const statusEmbed = new EmbedBuilder()
            .setTitle(`${SERVER_IP} Server Status`)
            .setColor(online ? 0x00FF00 : 0xFF0000) 
            .addFields(
                { name: 'Server Online:', value: online ? 'Yes' : 'No', inline: true },
                { name: 'Players Online:', value: `${players.online}/${players.max}`, inline: true },
                { name: 'Player List:', value: playerList || 'None', inline: false },
                { name: 'Version:', value: version || 'Unknown', inline: true },
                { name: 'Next Update:', value: `<t:${nextUpdateTime}:R>`, inline: false } 
            )
            .setFooter({ text: `MOTD: ${motd.clean.join(' ')}` })
            .setTimestamp();
        return statusEmbed;
    } catch (error) {
        console.error('Error fetching server status:', error.message || error);
        const errorEmbed = new EmbedBuilder()
            .setTitle('Server Status Error')
            .setColor(0xFF0000)
            .setDescription('Could not fetch server status. Please try again later.')
            .setTimestamp();
        return errorEmbed;
    }
}


async function sendOrUpdateStatusMessage(channel) {
    try {
        const statusEmbed = await getMinecraftServerStatus();

        if (!statusMessageId) {
            
            const statusMessage = await channel.send({ embeds: [statusEmbed] });
            statusMessageId = statusMessage.id; 
        } else {
          
            const statusMessage = await channel.messages.fetch(statusMessageId);
            await statusMessage.edit({ embeds: [statusEmbed] });
        }
    } catch (error) {
        console.error('Error sending or updating message:', error.message || error);
    }
}


async function startUpdatingStatus(channel) {
    
    await sendOrUpdateStatusMessage(channel);

   
    setInterval(async () => {
        await sendOrUpdateStatusMessage(channel);
    }, 300000);
}


client.on('messageCreate', async (message) => {
    if (message.content === '!start') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        const channel = client.channels.cache.get(CHANNEL_ID);
        if (!channel) {
            return message.reply('The specified channel was not found.');
        }

        message.reply('Starting the Minecraft server status updates...');
        await startUpdatingStatus(channel);
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(TOKEN);