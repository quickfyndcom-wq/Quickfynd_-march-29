// Firebase Auth-based admin check
const authAdmin = async (userId, email) => {
    try {
        if (!userId || !email) return false;
        // Prefer NEXT_PUBLIC_ADMIN_EMAIL if present (for Vercel/Next.js client/server parity)
        const envEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').replace(/['\"]/g, '').split(',');
        return envEmails.map(e => e.trim().toLowerCase()).includes(email.trim().toLowerCase());
    } catch (error) {
        console.error(error);
        return false;
    }
}

export default authAdmin