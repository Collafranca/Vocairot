# Vocairot Discord Bot

A Discord bot for balance management with cryptocurrency deposit support via NOWPayments integration.

## Features

- **Balance Command**: Check your current USD balance
- **Cryptocurrency Deposits**: Deposit money using Bitcoin, Ethereum, Litecoin, USDT, Dogecoin, and more
- **Payment Status Tracking**: Monitor your pending cryptocurrency payments
- **Automatic Balance Updates**: Balance is automatically updated when payments are confirmed
- **Payment History**: Track all your deposit transactions
- **User Data Persistence**: User balances and payment data are stored securely
- **Webhook Integration**: Real-time payment confirmations via NOWPayments webhooks

## Commands

### `/balance`
Check your current balance in USD and see pending payments.
- **Usage**: `/balance`
- **Response**: Shows your current balance and number of pending payments (only visible to you)

### `/deposit <amount>`
Deposit money to your balance using cryptocurrency.
- **Usage**: `/deposit amount:25.00`
- **Parameters**:
  - `amount` (required): Amount in USD to deposit (minimum $1.00)
- **Supported Cryptocurrencies**:
  - Bitcoin (BTC)
  - Ethereum (ETH) 
  - Litecoin (LTC)
  - Tether (USDT)
  - Dogecoin (DOGE)
- **Process**: 
  1. Select your preferred cryptocurrency
  2. Send the exact amount to the provided address
  3. Your balance will be automatically updated when payment is confirmed

### `/paymentstatus`
Check the status of your pending cryptocurrency payments.
- **Usage**: `/paymentstatus`
- **Response**: Shows all pending payments with their current status (only visible to you)

### `/addbalance <amount>` [ADMIN]
Manually add balance for testing purposes.
- **Usage**: `/addbalance amount:10.50`
- **Parameters**:
  - `amount` (required): Amount in USD to add (minimum $0.01)
- **Note**: This is kept for administrative/testing purposes

## Setup Instructions

### 1. Create a Discord Application and Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under the "Token" section, copy your bot token (you'll need this later)
5. Under "Privileged Gateway Intents", enable:
   - Message Content Intent (if you plan to add message-based commands later)

### 2. Set up NOWPayments Account

1. **Create an account** at [NOWPayments](https://nowpayments.io/)
2. **Get your API key** from the dashboard
3. **Set up webhook URL** (your server URL + `/webhook/nowpayments`)
4. **Generate a webhook secret** for security
5. **Test with sandbox** first (recommended)

### 3. Invite the Bot to Your Server

1. In the Discord Developer Portal, go to the "OAuth2" > "URL Generator" section
2. Select the following scopes:
   - `bot`
   - `applications.commands`
3. Select the following bot permissions:
   - `Send Messages`
   - `Use Slash Commands`
4. Copy the generated URL and open it in your browser
5. Select the server you want to add the bot to and authorize it

### 4. Install and Configure the Bot

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure your environment variables**:
   Edit the `.env` file and fill in your actual values:
   ```
   DISCORD_BOT_TOKEN=your_actual_bot_token_here
   
   # NOWPayments Configuration
   NOWPAYMENTS_API_KEY=your_nowpayments_api_key_here
   NOWPAYMENTS_SANDBOX=true
   NOWPAYMENTS_WEBHOOK_SECRET=your_webhook_secret_here
   WEBHOOK_URL=https://yourdomain.com/webhook/nowpayments
   ```

5. **Start the bot**:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

### 5. Verify Setup

Once the bot is running, you should see:
```
Logged in as YourBotName#1234!
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
Webhook server running on port 3000
```

The slash commands should now be available in your Discord server. Type `/` to see the available commands.

## Payment Flow

### How Cryptocurrency Deposits Work

1. **User initiates deposit**: User runs `/deposit amount:25.00`
2. **Currency selection**: Bot shows cryptocurrency options (BTC, ETH, LTC, USDT, DOGE)
3. **Payment creation**: Bot creates payment with NOWPayments and shows:
   - Cryptocurrency amount to send
   - Payment address
   - Payment ID
   - Expiration time
4. **User sends payment**: User sends the exact amount to the provided address
5. **Payment monitoring**: NOWPayments monitors the blockchain for the transaction
6. **Automatic confirmation**: When payment is confirmed:
   - User's balance is automatically updated
   - User receives a confirmation message
   - Payment is recorded in history

### Payment Status

- **Waiting**: Payment created, waiting for user to send cryptocurrency
- **Confirming**: Payment sent, waiting for blockchain confirmations
- **Finished**: Payment confirmed and balance updated
- **Failed/Expired**: Payment failed or expired (no balance change)

## File Structure

```
vocairot/
├── index.js            # Main bot file
├── package.json        # Project dependencies
├── .env                # Environment variables (create from .env.example)
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore file
├── README.md           # This file
├── services/
│   └── payments.js     # NOWPayments integration service
└── data/
    └── users.json      # User balance and payment data (auto-created)
```

## Data Storage

User data is stored in `data/users.json`. This file is automatically created when the bot first runs. The format is:

```json
{
  "user_discord_id": {
    "balance": 123.45,
    "pendingPayments": {
      "payment_id_123": {
        "payment_id": "payment_id_123",
        "price_amount": 25.00,
        "pay_currency": "btc",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    },
    "paymentHistory": [
      {
        "amount": 25.00,
        "paymentId": "payment_id_123",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "type": "crypto_deposit"
      }
    ]
  }
}
```

**Important**: Make sure to backup this file regularly if you're running the bot in production, as it contains all user balance and payment data.

## Security Notes

- Never commit your `.env` file to version control
- Keep your bot token and NOWPayments API key secure and never share them publicly
- Use sandbox mode for testing before going to production
- Set up proper webhook security with a strong webhook secret
- Ensure your webhook URL is accessible from the internet and uses HTTPS in production
- Regularly backup your user data file
- Monitor payment webhooks for any suspicious activity

## Troubleshooting

### Bot doesn't respond to commands
1. Make sure the bot is online in your server
2. Verify the bot has the "Use Slash Commands" permission
3. Check the console for any error messages

### "No Discord bot token found" error
1. Make sure you created the `.env` file from `.env.example`
2. Verify your bot token is correctly set in the `.env` file
3. Restart the bot after making changes to the `.env` file

### Commands not showing up
1. Wait a few minutes after starting the bot (Discord can take time to register commands)
2. Try typing `/` in your server to refresh the command list
3. Check if the bot has the "applications.commands" scope when invited

### Payment issues
1. **Payments not creating**: Check NOWPayments API key and sandbox settings
2. **Webhook not working**: Verify webhook URL is accessible and webhook secret is correct
3. **Balance not updating**: Check webhook logs and ensure payments are completing successfully
4. **Payment stuck**: Use `/paymentstatus` to check current status, payments may be waiting for blockchain confirmations

### NOWPayments setup issues
1. **API key invalid**: Double-check your API key from NOWPayments dashboard
2. **Webhook not receiving**: Ensure your webhook URL is publicly accessible (use ngrok for local testing)
3. **Sandbox vs Production**: Make sure `NOWPAYMENTS_SANDBOX` setting matches your API key type

## Development

To extend the bot with additional features:

1. **Add new cryptocurrencies**: Modify the currency selection menu in the `/deposit` command
2. **Add new commands**: Add new slash commands to the `commands` array and handle them in the interaction event
3. **Modify payment flow**: Customize the payment process in the `services/payments.js` file
4. **Add payment notifications**: Extend the webhook handler to send notifications to specific channels
5. **Add admin features**: Implement role-based permissions for administrative commands

### Testing with NOWPayments Sandbox

1. Set `NOWPAYMENTS_SANDBOX=true` in your `.env` file
2. Use sandbox API keys from NOWPayments
3. Sandbox payments won't use real cryptocurrency
4. Test the full payment flow without actual money

### Local Development with Webhooks

For local development, use [ngrok](https://ngrok.com/) to expose your webhook endpoint:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Use the ngrok URL in your .env file
WEBHOOK_URL=https://your-ngrok-url.ngrok.io/webhook/nowpayments
```

## License

ISC