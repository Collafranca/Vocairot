require('dotenv').config();
const { Client, GatewayIntentBits, Collection, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const NOWPaymentsService = require('./services/payments');

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

// Initialize payment service
const paymentsService = new NOWPaymentsService();

// Set up Express server for webhooks
const app = express();
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Webhook endpoint for NOWPayments
app.post('/webhook/nowpayments', async (req, res) => {
    try {
        const signature = req.headers['x-nowpayments-sig'];
        const payload = JSON.stringify(req.body);
        
        // Verify webhook signature
        if (!paymentsService.verifyWebhook(payload, signature)) {
            console.log('Invalid webhook signature');
            return res.status(401).send('Unauthorized');
        }
        
        const paymentData = req.body;
        console.log('Webhook received:', paymentData);
        
        // Handle different payment statuses
        if (paymentData.payment_status === 'finished') {
            // Payment completed successfully
            const result = completePendingPayment(paymentData.payment_id);
            
            if (result) {
                const { userId, payment } = result;
                
                // Add balance to user
                const newBalance = addUserBalance(userId, parseFloat(payment.price_amount), paymentData.payment_id);
                
                console.log(`Payment completed for user ${userId}: $${payment.price_amount}`);
                
                // Try to notify user via DM (optional)
                try {
                    const user = await client.users.fetch(userId);
                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Payment Confirmed!')
                        .setDescription(`Your deposit of **$${payment.price_amount} USD** has been confirmed!`)
                        .addFields(
                            { name: '💰 Amount Deposited', value: `$${payment.price_amount} USD`, inline: true },
                            { name: '💳 New Balance', value: `$${newBalance.toFixed(2)} USD`, inline: true },
                            { name: '🆔 Payment ID', value: `\`${paymentData.payment_id}\``, inline: false }
                        )
                        .setColor(0x00ff00)
                        .setTimestamp();
                    
                    await user.send({ embeds: [successEmbed] });
                } catch (dmError) {
                    console.log(`Could not send DM to user ${userId}:`, dmError.message);
                }
            }
        } else if (paymentData.payment_status === 'failed' || paymentData.payment_status === 'expired') {
            // Payment failed or expired
            const result = completePendingPayment(paymentData.payment_id);
            console.log(`Payment ${paymentData.payment_status} for payment ID ${paymentData.payment_id}`);
            
            if (result) {
                const { userId } = result;
                
                // Try to notify user via DM (optional)
                try {
                    const user = await client.users.fetch(userId);
                    const failEmbed = new EmbedBuilder()
                        .setTitle('❌ Payment Failed')
                        .setDescription(`Your payment has ${paymentData.payment_status}. Please try again.`)
                        .addFields(
                            { name: '🆔 Payment ID', value: `\`${paymentData.payment_id}\``, inline: false },
                            { name: '📝 Status', value: paymentData.payment_status, inline: true }
                        )
                        .setColor(0xff0000)
                        .setTimestamp();
                    
                    await user.send({ embeds: [failEmbed] });
                } catch (dmError) {
                    console.log(`Could not send DM to user ${userId}:`, dmError.message);
                }
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start webhook server
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3000;
app.listen(WEBHOOK_PORT, () => {
    console.log(`Webhook server running on port ${WEBHOOK_PORT}`);
});

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
function getUserData(userId) {
    if (!userData[userId]) {
        userData[userId] = { 
            balance: 0, 
            pendingPayments: {},
            paymentHistory: []
        };
        saveUserData(userData);
    }
    return userData[userId];
}

function getUserBalance(userId) {
    return getUserData(userId).balance;
}

function addUserBalance(userId, amount, paymentId = null) {
    const user = getUserData(userId);
    user.balance += amount;
    
    // Add to payment history
    if (paymentId) {
        user.paymentHistory.push({
            amount: amount,
            paymentId: paymentId,
            timestamp: new Date().toISOString(),
            type: 'crypto_deposit'
        });
    }
    
    saveUserData(userData);
    return user.balance;
}

function addPendingPayment(userId, paymentData) {
    const user = getUserData(userId);
    user.pendingPayments[paymentData.payment_id] = {
        ...paymentData,
        userId: userId,
        createdAt: new Date().toISOString()
    };
    saveUserData(userData);
}

function completePendingPayment(paymentId) {
    for (const userId in userData) {
        if (userData[userId].pendingPayments && userData[userId].pendingPayments[paymentId]) {
            const payment = userData[userId].pendingPayments[paymentId];
            delete userData[userId].pendingPayments[paymentId];
            saveUserData(userData);
            return { userId, payment };
        }
    }
    return null;
}

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current balance in USD'),
    
    new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Deposit money to your balance using cryptocurrency')
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Amount in USD to deposit')
                .setRequired(true)
                .setMinValue(1)
        ),
    
    new SlashCommandBuilder()
        .setName('paymentstatus')
        .setDescription('Check the status of your pending payments'),
        
    // Keep the old addbalance command for admin/testing purposes
    new SlashCommandBuilder()
        .setName('addbalance')
        .setDescription('[ADMIN] Manually add balance (for testing)')
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
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, user } = interaction;

            switch (commandName) {
                case 'balance':
                    const balance = getUserBalance(user.id);
                    const userData = getUserData(user.id);
                    const pendingCount = Object.keys(userData.pendingPayments || {}).length;
                    
                    let balanceMessage = `💰 Your current balance is **$${balance.toFixed(2)} USD**`;
                    if (pendingCount > 0) {
                        balanceMessage += `\n⏳ You have ${pendingCount} pending payment(s). Use \`/paymentstatus\` to check them.`;
                    }
                    
                    await interaction.reply({
                        content: balanceMessage,
                        ephemeral: true
                    });
                    break;

                case 'deposit':
                    const amount = interaction.options.getNumber('amount');
                    
                    // Create currency selection menu
                    const currencyMenu = new StringSelectMenuBuilder()
                        .setCustomId(`deposit_${user.id}_${amount}`)
                        .setPlaceholder('Choose a cryptocurrency to pay with')
                        .addOptions([
                            {
                                label: 'Bitcoin (BTC)',
                                value: 'btc',
                                emoji: '₿'
                            },
                            {
                                label: 'Ethereum (ETH)',
                                value: 'eth',
                                emoji: '⟠'
                            },
                            {
                                label: 'Litecoin (LTC)',
                                value: 'ltc',
                                emoji: 'Ł'
                            },
                            {
                                label: 'Tether (USDT)',
                                value: 'usdt',
                                emoji: '₮'
                            },
                            {
                                label: 'Dogecoin (DOGE)',
                                value: 'doge',
                                emoji: '🐕'
                            }
                        ]);

                    const row = new ActionRowBuilder().addComponents(currencyMenu);

                    await interaction.reply({
                        content: `💳 **Deposit $${amount.toFixed(2)} USD**\n\nSelect the cryptocurrency you'd like to use for payment:`,
                        components: [row],
                        ephemeral: true
                    });
                    break;

                case 'paymentstatus':
                    const userDataStatus = getUserData(user.id);
                    const pending = userDataStatus.pendingPayments || {};
                    
                    if (Object.keys(pending).length === 0) {
                        await interaction.reply({
                            content: '✅ You have no pending payments.',
                            ephemeral: true
                        });
                        return;
                    }
                    
                    let statusMessage = '⏳ **Your Pending Payments:**\n\n';
                    for (const [paymentId, payment] of Object.entries(pending)) {
                        try {
                            const status = await paymentsService.getPaymentStatus(paymentId);
                            statusMessage += `**Payment ID:** \`${paymentId}\`\n`;
                            statusMessage += `**Amount:** $${payment.price_amount} USD\n`;
                            statusMessage += `**Currency:** ${payment.pay_currency.toUpperCase()}\n`;
                            statusMessage += `**Status:** ${status.payment_status}\n`;
                            statusMessage += `**Created:** ${new Date(payment.createdAt).toLocaleString()}\n\n`;
                        } catch (error) {
                            statusMessage += `**Payment ID:** \`${paymentId}\`\n`;
                            statusMessage += `**Status:** Error fetching status\n\n`;
                        }
                    }
                    
                    await interaction.reply({
                        content: statusMessage,
                        ephemeral: true
                    });
                    break;

                case 'addbalance':
                    // Keep this for admin/testing purposes
                    const adminAmount = interaction.options.getNumber('amount');
                    const newBalance = addUserBalance(user.id, adminAmount);
                    await interaction.reply({
                        content: `✅ [ADMIN] Successfully added **$${adminAmount.toFixed(2)} USD** to your balance!\n💰 New balance: **$${newBalance.toFixed(2)} USD**`,
                        ephemeral: true
                    });
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Unknown command!',
                        ephemeral: true
                    });
            }
        } else if (interaction.isStringSelectMenu()) {
            // Handle currency selection for deposits
            if (interaction.customId.startsWith('deposit_')) {
                const [, userId, amount] = interaction.customId.split('_');
                const selectedCurrency = interaction.values[0];
                
                if (userId !== interaction.user.id) {
                    await interaction.reply({
                        content: '❌ This deposit request is not for you!',
                        ephemeral: true
                    });
                    return;
                }
                
                await interaction.deferReply({ ephemeral: true });
                
                try {
                    // Create payment with NOWPayments
                    const orderId = paymentsService.generateOrderId(userId);
                    const payment = await paymentsService.createPayment(
                        parseFloat(amount),
                        'usd',
                        selectedCurrency,
                        userId,
                        orderId
                    );
                    
                    // Store pending payment
                    addPendingPayment(userId, payment);
                    
                    // Create payment embed
                    const paymentEmbed = new EmbedBuilder()
                        .setTitle('💳 Payment Created')
                        .setDescription(`Your payment has been created! Send **${payment.pay_amount} ${payment.pay_currency.toUpperCase()}** to the address below.`)
                        .addFields(
                            { name: '💰 Amount to Pay', value: `${payment.pay_amount} ${payment.pay_currency.toUpperCase()}`, inline: true },
                            { name: '💵 USD Value', value: `$${payment.price_amount}`, inline: true },
                            { name: '📍 Payment Address', value: `\`\`\`${payment.pay_address}\`\`\``, inline: false },
                            { name: '🆔 Payment ID', value: `\`${payment.payment_id}\``, inline: true },
                            { name: '⏰ Valid Until', value: `<t:${Math.floor((Date.now() + 3600000) / 1000)}:F>`, inline: true }
                        )
                        .setColor(0x00ff00)
                        .setFooter({ text: 'Send the exact amount to the address above. Your balance will be updated automatically once the payment is confirmed.' });
                    
                    await interaction.editReply({
                        embeds: [paymentEmbed],
                        components: []
                    });
                    
                } catch (error) {
                    console.error('Error creating payment:', error);
                    await interaction.editReply({
                        content: '❌ Error creating payment. Please try again later or contact support.',
                        components: []
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        
        const errorMessage = '❌ An error occurred while processing your request. Please try again later.';
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage, components: [] });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
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