const getEnv = () => {
  const spaceId = process.env.CONTENTFUL_SPACE_ID;
  const environment = process.env.CONTENTFUL_ENVIRONMENT ?? "master";
  const deliveryToken = process.env.CONTENTFUL_DELIVERY_TOKEN;
  const previewToken = process.env.CONTENTFUL_PREVIEW_TOKEN;
  const graphqlHost =
    process.env.CONTENTFUL_GRAPHQL_HOST ?? "graphql.contentful.com";
  const previewGraphqlHost =
    process.env.CONTENTFUL_PREVIEW_GRAPHQL_HOST ?? "preview.contentful.com";

  if (!spaceId || spaceId.trim() === "") {
    throw new Error("Missing or empty CONTENTFUL_SPACE_ID environment variable");
  }
  if (!deliveryToken || deliveryToken.trim() === "") {
    throw new Error(
      "Missing or empty CONTENTFUL_DELIVERY_TOKEN environment variable"
    );
  }

  return {
    spaceId: spaceId.trim(),
    environment: environment.trim(),
    deliveryToken: deliveryToken.trim(),
    previewToken: previewToken?.trim(),
    graphqlHost: graphqlHost.trim(),
    previewGraphqlHost: previewGraphqlHost.trim(),
  };
};

type RequestOptions = {
  preview?: boolean;
};

export async function contentfulFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  { preview = false }: RequestOptions = {}
): Promise<T> {
  const env = getEnv();
  const token = preview ? env.previewToken : env.deliveryToken;
  if (!token) {
    throw new Error(
      preview ? "Missing CONTENTFUL_PREVIEW_TOKEN" : "Missing CONTENTFUL_DELIVERY_TOKEN"
    );
  }
  const host = preview ? env.previewGraphqlHost : env.graphqlHost;
  const endpoint = `https://${host}/content/v1/spaces/${env.spaceId}/environments/${env.environment}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `Contentful request failed: ${res.status} ${res.statusText}\n${bodyText}`
    );
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Contentful errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Contentful response missing data");
  }
  return json.data;
}
