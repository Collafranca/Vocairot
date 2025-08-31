const axios = require('axios');
const crypto = require('crypto');

class NOWPaymentsService {
    constructor() {
        this.apiKey = process.env.NOWPAYMENTS_API_KEY;
        this.isSandbox = process.env.NOWPAYMENTS_SANDBOX === 'true';
        this.webhookSecret = process.env.NOWPAYMENTS_WEBHOOK_SECRET;
        this.webhookUrl = process.env.WEBHOOK_URL;
        
        // Use sandbox or production API URL
        this.baseURL = this.isSandbox 
            ? 'https://api-sandbox.nowpayments.io/v1'
            : 'https://api.nowpayments.io/v1';
            
        this.headers = {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get available currencies for payments
     */
    async getAvailableCurrencies() {
        try {
            const response = await axios.get(`${this.baseURL}/currencies`, {
                headers: this.headers
            });
            return response.data.currencies;
        } catch (error) {
            console.error('Error fetching currencies:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get minimum payment amount for a specific currency
     */
    async getMinimumAmount(currencyFrom, currencyTo = 'usd') {
        try {
            const response = await axios.get(`${this.baseURL}/min-amount`, {
                headers: this.headers,
                params: {
                    currency_from: currencyFrom,
                    currency_to: currencyTo
                }
            });
            return response.data.min_amount;
        } catch (error) {
            console.error('Error fetching minimum amount:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create a payment
     */
    async createPayment(priceAmount, priceCurrency, payCurrency, userId, orderId) {
        try {
            const paymentData = {
                price_amount: priceAmount,
                price_currency: priceCurrency,
                pay_currency: payCurrency,
                ipn_callback_url: this.webhookUrl,
                order_id: orderId,
                order_description: `Discord Bot Balance Top-up - User ${userId}`
            };

            const response = await axios.post(`${this.baseURL}/payment`, paymentData, {
                headers: this.headers
            });

            return response.data;
        } catch (error) {
            console.error('Error creating payment:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(paymentId) {
        try {
            const response = await axios.get(`${this.baseURL}/payment/${paymentId}`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching payment status:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhook(payload, signature) {
        if (!this.webhookSecret) {
            console.warn('Webhook secret not configured');
            return false;
        }

        const hmac = crypto.createHmac('sha512', this.webhookSecret);
        hmac.update(payload);
        const calculatedSignature = hmac.digest('hex');
        
        return signature === calculatedSignature;
    }

    /**
     * Get estimated price for a payment
     */
    async getEstimatedPrice(amount, currencyFrom, currencyTo = 'usd') {
        try {
            const response = await axios.get(`${this.baseURL}/estimate`, {
                headers: this.headers,
                params: {
                    amount: amount,
                    currency_from: currencyFrom,
                    currency_to: currencyTo
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error getting price estimate:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Generate a unique order ID
     */
    generateOrderId(userId) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${userId}-${timestamp}-${random}`;
    }
}

module.exports = NOWPaymentsService;