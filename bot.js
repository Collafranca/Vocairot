require('dotenv').config();
const { Client, GatewayIntentBits, Collection, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Create commands collection
client.commands = new Collection();

// Load user data
const dataPath = path.join(__dirname, 'data', 'users.json');

function loadUserData() {
    if (!fs.existsSync(path.dirname(dataPath))) {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    }
    
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({}));
        return {};
    }
    
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading user data:', error);
        return {};
    }
}

function saveUserData(data) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Load initial user data
let userData = loadUserData();

// Helper functions for user balance management
function getUserBalance(userId) {
    if (!userData[userId]) {
        userData[userId] = { balance: 0 };
        saveUserData(userData);
    }
    return userData[userId].balance;
}

function addUserBalance(userId, amount) {
    if (!userData[userId]) {
        userData[userId] = { balance: 0 };
    }
    userData[userId].balance += amount;
    saveUserData(userData);
    return userData[userId].balance;
}

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current balance in USD'),
    
    new SlashCommandBuilder()
        .setName('addbalance')
        .setDescription('Add money to your balance')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount in USD to add to your balance')
                .setRequired(true)
                .setMinValue(0.01)
        )
];

// Register commands when bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    try {
        console.log('Started refreshing application (/) commands.');
        
        // Register commands globally (you can also register them per guild for faster updates during development)
        await client.application.commands.set(commands);
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;

    try {
        switch (commandName) {
            case 'balance':
                const balance = getUserBalance(user.id);
                await interaction.reply({
                    content: `💰 Your current balance is **$${balance.toFixed(2)} USD**`,
                    ephemeral: true // Only the user can see this message
                });
                break;

            case 'addbalance':
                const amount = interaction.options.getNumber('amount');
                const newBalance = addUserBalance(user.id, amount);
                await interaction.reply({
                    content: `✅ Successfully added **$${amount.toFixed(2)} USD** to your balance!\n💰 New balance: **$${newBalance.toFixed(2)} USD**`,
                    ephemeral: true
                });
                break;

            default:
                await interaction.reply({
                    content: '❌ Unknown command!',
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Error handling command:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ An error occurred while processing your command. Please try again later.',
                ephemeral: true
            });
        }
    }
});

// Error handling
client.on('error', console.error);

// Login to Discord with your client's token
const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
    console.error('❌ No Discord bot token found! Please set the DISCORD_BOT_TOKEN environment variable.');
    process.exit(1);
}

client.login(token);