const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, customerName, customerPhone } = req.body;

    // Stripe calculates in cents (e.g., €25.50 becomes 2550)
    const amountInCents = Math.round(Number(amount) * 100);

    if (!amountInCents || amountInCents < 50) {
      return res.status(400).json({ error: 'Order total must be at least €0.50' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      capture_method: 'manual', // Places a hold ONLY — does not take money
      description: `Click & Collect Hold - ${customerName || 'Customer'} (${customerPhone || 'No phone'})`,
      metadata: {
        customerName: customerName || '',
        customerPhone: customerPhone || '',
      },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe Auth Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
