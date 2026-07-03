const getEnv = () => {
  const apiKey = process.env.CONTENTSTACK_API_KEY;
  const deliveryToken = process.env.CONTENTSTACK_DELIVERY_TOKEN;
  const environment = process.env.CONTENTSTACK_ENVIRONMENT;
  const previewToken = process.env.CONTENTSTACK_PREVIEW_TOKEN;
  const branch = process.env.CONTENTSTACK_BRANCH;
  const graphqlHost =
    process.env.CONTENTSTACK_GRAPHQL_HOST ?? "graphql.contentstack.com";
  const previewGraphqlHost =
    process.env.CONTENTSTACK_PREVIEW_GRAPHQL_HOST ??
    "graphql-preview.contentstack.com";

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Missing or empty CONTENTSTACK_API_KEY environment variable");
  }
  if (!deliveryToken || deliveryToken.trim() === "") {
    throw new Error(
      "Missing or empty CONTENTSTACK_DELIVERY_TOKEN environment variable"
    );
  }
  if (!environment || environment.trim() === "") {
    throw new Error(
      "Missing or empty CONTENTSTACK_ENVIRONMENT environment variable"
    );
  }

  return {
    apiKey: apiKey.trim(),
    deliveryToken: deliveryToken.trim(),
    environment: environment.trim(),
    previewToken: previewToken?.trim(),
    branch: branch?.trim(),
    graphqlHost: graphqlHost.trim(),
    previewGraphqlHost: previewGraphqlHost.trim(),
  };
};

type RequestOptions = {
  preview?: boolean;
  /**
   * Live Preview hash, forwarded as the `live_preview` header. Supplied by the
   * Contentstack Live Preview SDK when the site is rendered inside the preview
   * panel; omit it for plain draft reads.
   */
  livePreviewHash?: string;
};

/**
 * POSTs a GraphQL query to the Contentstack Content Delivery API.
 *
 * Delivery endpoint:
 *   https://<graphqlHost>/stacks/<apiKey>?environment=<environment>
 * The environment-specific delivery token rides in the `access_token` header.
 * In preview mode we swap to the preview host and add the `preview_token`
 * (plus the optional `live_preview` hash) headers.
 */
export async function contentstackFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  { preview = false, livePreviewHash }: RequestOptions = {}
): Promise<T> {
  const env = getEnv();
  const host = preview ? env.previewGraphqlHost : env.graphqlHost;
  const endpoint = `https://${host}/stacks/${env.apiKey}?environment=${encodeURIComponent(
    env.environment
  )}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    access_token: env.deliveryToken,
  };
  if (env.branch) headers.branch = env.branch;
  if (preview) {
    if (!env.previewToken) {
      throw new Error("Missing CONTENTSTACK_PREVIEW_TOKEN");
    }
    headers.preview_token = env.previewToken;
    if (livePreviewHash) headers.live_preview = livePreviewHash;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `Contentstack request failed: ${res.status} ${res.statusText}\n${bodyText}`
    );
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) {
    throw new Error(
      `Contentstack errors: ${json.errors.map((e) => e.message).join("; ")}`
    );
  }
  if (!json.data) {
    throw new Error("Contentstack response missing data");
  }
  return json.data;
}
