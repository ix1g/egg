/* 
███    ███  █████  ██████  ███████     ██████  ██    ██     ███████  █████  ██    ██ ██████  ███████ 
████  ████ ██   ██ ██   ██ ██          ██   ██  ██  ██      ██      ██   ██  ██  ██  ██   ██    ███  
██ ████ ██ ███████ ██   ██ █████       ██████    ████       ███████ ███████   ████   ██████    ███   
██  ██  ██ ██   ██ ██   ██ ██          ██   ██    ██             ██ ██   ██    ██    ██   ██  ███    
██      ██ ██   ██ ██████  ███████     ██████     ██        ███████ ██   ██    ██    ██   ██ ███████ 

Original Repo: https://github.com/ix1g/egg
License: MIT
*/ 

const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let statusMessageId = null; 

async function getMinecraftServerStatus() {
    try {
        const response = await axios.get(`https://api.mcsrvstat.us/2/${process.env.SERVER_IP}`);
        const { online, players, motd, version } = response.data;

        let playerList = players.list ? players.list.join(', ') : 'No players online';
        
        const nextUpdateTime = Math.floor((Date.now() + 5 * 60 * 1000) / 1000); 

        const statusEmbed = new EmbedBuilder()
            .setTitle(`${process.env.SERVER_IP} Server Status`)
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

async function sendOrUpdateStatusMessage(channelId) {
    try {
        const statusEmbed = await getMinecraftServerStatus();
        const channel = client.channels.cache.get(channelId); 
        
        if (!channel) {
            console.error('Error: Channel not found');
            return;
        }

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

async function startUpdatingStatus(channelId) {
    await sendOrUpdateStatusMessage(channelId);
    setInterval(async () => {
        await sendOrUpdateStatusMessage(channelId);
    }, 300000);
}

client.on('messageCreate', async (message) => {
    if (message.content === '!start') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        const channel = client.channels.cache.get(process.env.CHANNEL_ID);
        if (!process.env.CHANNEL_ID) {
            return message.reply('The specified channel was not found.');
        }

        message.reply('Starting the Minecraft server status updates...');
        await startUpdatingStatus(process.env.CHANNEL_ID);
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.TOKEN);
