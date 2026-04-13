import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk/v2"
import type { OpenCodeClient, OpenCodeManagedServer, OpenCodeSdkClientLike } from "../types.js"

function wrapSdkClient(sdkClient: OpenCodeSdkClientLike): OpenCodeClient {
  return {
    session: {
      create: () => sdkClient.session.create(),
      prompt: (parameters) => sdkClient.session.prompt(parameters),
      delete: (parameters) => sdkClient.session.delete(parameters),
    },
  }
}

export async function createClient(baseUrl?: string): Promise<{
  client: OpenCodeClient
  managedServer?: OpenCodeManagedServer
}> {
  if (baseUrl && baseUrl.trim().length > 0) {
    const sdkClient = createOpencodeClient({ baseUrl })
    return {
      client: wrapSdkClient(sdkClient),
    }
  }

  const managedOpencode = await createOpencode()

  return {
    client: wrapSdkClient(managedOpencode.client),
    managedServer: managedOpencode.server,
  }
}
