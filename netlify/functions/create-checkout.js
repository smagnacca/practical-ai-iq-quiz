// Netlify Function: create-checkout.js
// Creates a Stripe Checkout Session for the $9.99→$1 AI Skills IQ Report
// Env vars needed: STRIPE_SECRET_KEY

const stripe = require('stripe');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { firstName, email, industry, score, cats, totalCorrect, totalQuestions, reportData } = JSON.parse(event.body || '{}');

    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
    if (!process.env.STRIPE_SECRET_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured' }) };

    const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

    // Base64-encode the report data for the success URL
    const reportPayload = Buffer.from(JSON.stringify({
      firstName, email, industry, score, cats, totalCorrect, totalQuestions
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const siteUrl = process.env.URL || 'https://practical-ai-skills-iq.netlify.app';

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Practical AI Skills IQ — Personalized Report',
            description: `Complete AI skills analysis for ${firstName} with personalized action plan, category breakdown, industry benchmarks, and recommended next steps.`,
          },
          unit_amount: 100, // $1.00 in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${siteUrl}/report.html?data=${reportPayload}&paid=1`,
      cancel_url: `${siteUrl}/?cancelled=1`,
      metadata: {
        firstName,
        email,
        industry: industry || '',
        score: String(score),
        quizType: 'ai-iq-report',
      },
      // Show the discount
      custom_text: {
        submit: {
          message: 'Original price $9.99 — You\'re getting 90% off today!'
        }
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err) {
    console.error('create-checkout error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
