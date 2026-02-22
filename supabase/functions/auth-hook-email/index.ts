import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'https://aurum-fashion.com'
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET')

const AURUM_GOLD = '#D4AF37'
const AURUM_DARK = '#121212'
const AURUM_TEXT = '#E0E0E0'

interface WebhookPayload {
    user: any
    email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
        token_new?: string
        token_hash_new?: string
    }
}

const getBaseTemplate = (content: string, ctaText: string, ctaUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Playfair Display', serif; background-color: ${AURUM_DARK}; color: ${AURUM_TEXT}; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; padding: 40px; background-color: #1a1a1a; border: 1px solid #333; }
        .logo { text-align: center; font-size: 32px; letter-spacing: 8px; color: ${AURUM_GOLD}; text-transform: uppercase; margin-bottom: 40px; }
        .content { font-size: 16px; line-height: 1.6; margin-bottom: 40px; text-align: center; }
        .cta-container { text-align: center; }
        .cta-button { 
            background-color: ${AURUM_GOLD}; 
            color: #000; 
            padding: 16px 32px; 
            text-decoration: none; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 2px;
            display: inline-block;
        }
        .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #666; letter-spacing: 1px; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, ${AURUM_GOLD}, transparent); margin: 40px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">AURUM</div>
        <div class="content">
            ${content}
        </div>
        <div class="cta-container">
            <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
        </div>
        <div class="divider"></div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} AURUM FASHION MARKET. ALL RIGHTS RESERVED.<br>
            UNCOMPROMISING LUXURY.
        </div>
    </div>
</body>
</html>
`

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Not allowed', { status: 405 })
    }

    try {
        const payloadText = await req.text()

        // Verify signature if secret is provided
        if (HOOK_SECRET) {
            const headers = Object.fromEntries(req.headers.entries())
            const wh = new Webhook(HOOK_SECRET)
            try {
                wh.verify(payloadText, headers)
            } catch (err) {
                console.error('Webhook signature verification failed:', err)
                return new Response(
                    JSON.stringify({ error: 'invalid_signature' }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                )
            }
        } else {
            console.warn('SEND_EMAIL_HOOK_SECRET not set, skipping signature verification.')
        }

        const payload: WebhookPayload = JSON.parse(payloadText)
        const { email_action_type, token, token_hash, redirect_to, site_url: payloadSiteUrl } = payload.email_data
        const email = payload.user.email

        // Construct the actual URL based on Supabase requirements
        const authUrl = payloadSiteUrl || SITE_URL
        let ctaUrl = ''
        let subject = ''
        let content = ''
        let ctaText = ''

        switch (email_action_type) {
            case 'signup':
                subject = 'Welcome to the World of Aurum'
                content = `Welcome to Aurum. We are pleased to have you among our exclusive clientele. Please confirm your account to begin your luxury shopping experience.`
                ctaText = 'Confirm Membership'
                ctaUrl = `${authUrl}/verify?token=${token_hash}&type=signup&redirect_to=${redirect_to}`
                break
            case 'recovery':
                subject = 'Resurrect Your Access'
                content = `A request has been made to reset your access to Aurum. If this was you, please follow the link below to set a new password.`
                ctaText = 'Reset Password'
                ctaUrl = `${authUrl}/verify?token=${token_hash}&type=recovery&redirect_to=${redirect_to}`
                break
            case 'magiclink':
                subject = 'Your Private Entrance'
                content = `Welcome back to Aurum. Use the secure link below to enter your account without a password.`
                ctaText = 'Enter Now'
                ctaUrl = `${authUrl}/verify?token=${token_hash}&type=magiclink&redirect_to=${redirect_to}`
                break
            case 'invite':
                subject = 'An Exclusive Invitation to Aurum'
                content = `You have been uniquely selected to join Aurum Fashion Market. An account has been prepared for you.`
                ctaText = 'Accept Invitation'
                ctaUrl = `${authUrl}/verify?token=${token_hash}&type=invite&redirect_to=${redirect_to}`
                break
            default:
                // Generic fallback
                subject = 'Update from Aurum'
                content = `An action requires your attention on your Aurum account.`
                ctaText = 'Verify Action'
                ctaUrl = `${authUrl}/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
        }

        const html = getBaseTemplate(content, ctaText, ctaUrl)

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Aurum Fashion <onboarding@resend.dev>', // Should use verified domain in production
                to: [email],
                subject: subject,
                html: html
            })
        })

        if (!res.ok) {
            const errorData = await res.text()
            console.error('Failed to send email via Resend:', errorData)
            // EMERGENCY FIX: Do NOT return 500. Returning 500 blocks the Supabase Auth flow (signup/login).
            // We return 200 to allow the user to proceed, even if the custom email failed to send.
            // Check your RESEND_API_KEY in Supabase Secrets!
            return new Response(
                JSON.stringify({ warning: 'email_failed_but_flow_continued' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Return empty JSON object on success as per Supabase Send Email Hook spec
        return new Response(
            JSON.stringify({}),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error handling webhook:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
