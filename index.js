const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// Made By Occult
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const webhookCache = new Map();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    const command = new SlashCommandBuilder()
        .setName('textas')
        .setDescription('Send a message as another user')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Mention a user to copy their name and avatar')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username to display (overrides user mention)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('avatar')
                .setDescription('Avatar URL (overrides user mention)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks);

    try {
        await client.application.commands.create(command);
        console.log('Slash command registered successfully!');
    } catch (error) {
        console.error('Error registering command:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'textas') return;

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
        return interaction.reply({
            content: 'I need the "Manage Webhooks" permission to use this command!',
            ephemeral: true
        });
    }

    const mentionedUser = interaction.options.getUser('user');
    let username = interaction.options.getString('username');
    const message = interaction.options.getString('message');
    let avatarUrl = interaction.options.getString('avatar');

    if (mentionedUser) {
        if (!username) {
            const member = await interaction.guild.members.fetch(mentionedUser.id);
            username = member.displayName;
        }
        if (!avatarUrl) {
            avatarUrl = mentionedUser.displayAvatarURL({ dynamic: true, size: 256 });
        }
    }

    if (!username) {
        return interaction.reply({
            content: 'You must provide either a user mention or a username!',
            ephemeral: true
        });
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        let webhook;

        if (webhookCache.has(channel.id)) {
            webhook = webhookCache.get(channel.id);
            try {
                await webhook.fetch();
            } catch (error) {
                webhookCache.delete(channel.id);
                webhook = null;
            }
        }

        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'TextAs Bot',
                reason: 'For /textas command'
            });
            webhookCache.set(channel.id, webhook);
        }

        await webhook.send({
            content: message,
            username: username,
            avatarURL: avatarUrl || undefined
        });

        await webhook.delete('Message sent, cleaning up');
        webhookCache.delete(channel.id);

        await interaction.editReply({
            content: `Message sent as **${username}**!`
        });

    } catch (error) {
        console.error('Error executing textas command:', error);
        
        const errorMessage = error.code === 50013 
            ? 'I don\'t have permission to create webhooks in this channel!'
            : `An error occurred: ${error.message}`;
        
        if (interaction.deferred) {
            await interaction.editReply({ content: errorMessage });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

client.login('Your_Bot_Token_Here');