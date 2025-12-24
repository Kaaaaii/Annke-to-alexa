import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// OAuth2 Authorization Endpoint
// Alexa redirects user here to link account
router.get('/', (req: Request, res: Response) => {
    const { client_id, response_type, state, redirect_uri } = req.query;

    logger.info(`OAuth Authorization request: client_id=${client_id}, redirect_uri=${redirect_uri}`);

    // Simple consent page
    // In a real app, you would check login session here.
    // We just show a button to "Link Account" which acts as "Login & Consent"

    // We will immediately redirect back with a code for simplicity, 
    // or serve a simple HTML page. Let's serve HTML for better UX/Debugging.

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Link Annke Cameras</title>
        <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; }
            .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Link Annke Cameras to Alexa</h2>
            <p>Allow Alexa to access your cameras?</p>
            <form action="/api/auth/login" method="POST">
                <input type="hidden" name="state" value="${state}" />
                <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
                <button type="submit">Authorize</button>
            </form>
        </div>
    </body>
    </html>
    `;

    res.send(html);
});

// Handle the form submission -> Redirect back to Alexa
router.post('/login', (req: Request, res: Response) => {
    const { state, redirect_uri } = req.body;

    // Generate a dummy code
    const code = 'spl_code_' + crypto.randomUUID();

    // Redirect back to Alexa
    const redirectUrl = `${redirect_uri}?state=${state}&code=${code}`;
    logger.info(`Redirecting back to Alexa: ${redirectUrl}`);

    res.redirect(redirectUrl);
});

// OAuth2 Token Endpoint
router.post('/token', (req: Request, res: Response) => {
    const { grant_type, code, refresh_token } = req.body;

    logger.info(`OAuth Token request: grant_type=${grant_type}`);

    // Return static token info
    res.json({
        access_token: 'access_token_' + crypto.randomUUID(),
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token_' + crypto.randomUUID()
    });
});

export default router;
