// Convex auth configuration (config object default export)
// Source: Clerk + Convex integration examples
// https://clerk.com/docs/integrations/databases/convex

export default {
  providers: [
    {
      // Set this in Convex environment variables to your Clerk Frontend API URL, e.g.
      // https://<your-subdomain>.clerk.accounts.dev
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};
