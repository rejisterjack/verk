import { createSamlClient, samlEnv } from "@/lib/saml";

/** Service-provider metadata. Google Workspace asks for the ACS URL and Entity ID shown here. */
export async function GET() {
  const env = samlEnv();

  if (!env) return new Response(null, { status: 404 });
  const saml = await createSamlClient(env);
  const xml = saml!.generateServiceProviderMetadata(null, null);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/samlmetadata+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
