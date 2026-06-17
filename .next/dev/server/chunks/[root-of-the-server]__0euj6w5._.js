module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/pages/api/auth/login.js [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>handler
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            message: 'Method Not Allowed'
        });
    }
    try {
        const { email, password } = req.body;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@oa-evenementiel.fr';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
        if (email === adminEmail && password === adminPassword) {
            // Create a secure token locally using crypto (zero dependencies)
            const payload = {
                email,
                role: 'authenticated',
                exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
            };
            const secret = process.env.JWT_SECRET || 'super_secret_local_key_for_jwt_tokens_12345';
            const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
            const signature = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHmac('sha256', secret).update(payloadStr).digest('base64');
            const token = `${payloadStr}.${signature}`;
            return res.status(200).json({
                user: {
                    email,
                    role: 'authenticated'
                },
                session: {
                    access_token: token,
                    user: {
                        email,
                        role: 'authenticated'
                    }
                }
            });
        }
        return res.status(400).json({
            message: 'Identifiants incorrects.'
        });
    } catch (error) {
        console.error('[API Login Error]', error);
        return res.status(500).json({
            message: 'Internal Server Error'
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0euj6w5._.js.map