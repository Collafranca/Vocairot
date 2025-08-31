# Vocairot Discord Bot

A Discord bot for balance management with USD balance tracking.

## Features

- **Balance Command**: Check your current USD balance
- **Add Balance Command**: Add money to your balance
- **User Data Persistence**: User balances are stored in a JSON file
- **Secure**: Uses environment variables for the bot token

## Commands

### `/balance`
Check your current balance in USD.
- **Usage**: `/balance`
- **Response**: Shows your current balance (only visible to you)

### `/addbalance <amount>`
Add money to your balance.
- **Usage**: `/addbalance amount:10.50`
- **Parameters**:
  - `amount` (required): Amount in USD to add (minimum $0.01)
- **Response**: Shows the added amount and your new balance (only visible to you)

## Setup Instructions

### 1. Create a Discord Application and Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under the "Token" section, copy your bot token (you'll need this later)
5. Under "Privileged Gateway Intents", enable:
   - Message Content Intent (if you plan to add message-based commands later)

### 2. Invite the Bot to Your Server

1. In the Discord Developer Portal, go to the "OAuth2" > "URL Generator" section
2. Select the following scopes:
   - `bot`
   - `applications.commands`
3. Select the following bot permissions:
   - `Send Messages`
   - `Use Slash Commands`
4. Copy the generated URL and open it in your browser
5. Select the server you want to add the bot to and authorize it

### 3. Install and Configure the Bot

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure your bot token**:
   Edit the `.env` file and replace `your_discord_bot_token_here` with your actual bot token:
   ```
   DISCORD_BOT_TOKEN=your_actual_bot_token_here
   ```

5. **Start the bot**:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

### 4. Verify Setup

Once the bot is running, you should see:
```
Logged in as YourBotName#1234!
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
```

The slash commands should now be available in your Discord server. Type `/` to see the available commands.

## File Structure

```
vocairot/
├── index.js            # Main bot file
├── package.json        # Project dependencies
├── .env                # Environment variables (create from .env.example)
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore file
├── README.md           # This file
└── data/
    └── users.json      # User balance data (auto-created)
```

## Data Storage

User balances are stored in `data/users.json`. This file is automatically created when the bot first runs. The format is:

```json
{
  "user_discord_id": {
    "balance": 123.45
  }
}
```

**Important**: Make sure to backup this file regularly if you're running the bot in production, as it contains all user balance data.

## Security Notes

- Never commit your `.env` file to version control
- Keep your bot token secure and never share it publicly
- The bot token in `.env` should have the format: `DISCORD_BOT_TOKEN=your_token_here`

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

## Development

To extend the bot with additional features:

1. Add new slash commands to the `commands` array
2. Handle the new commands in the `interactionCreate` event
3. Modify the user data structure in `users.json` if needed

## License

ISC