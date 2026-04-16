import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk/v2"
import type { OpenCodeClient, OpenCodeManagedServer, OpenCodeSdkClientLike } from "../types.js"

const wrapSdkClient = (sdkClient: OpenCodeSdkClientLike): OpenCodeClient => {
  return {
    session: {
      create: () => sdkClient.session.create(),
      prompt: (parameters) => sdkClient.session.prompt(parameters),
      delete: (parameters) => sdkClient.session.delete(parameters),
    },
  }
}

const createAuthHeader = (username: string, password: string): string => {
  const credentials = `${username}:${password}`
  const encoded = Buffer.from(credentials).toString("base64")
  return `Basic ${encoded}`
}

export const createClient = async (baseUrl?: string): Promise<{
  client: OpenCodeClient
  managedServer?: OpenCodeManagedServer
}> => {
  if (baseUrl && baseUrl.trim().length > 0) {
    const serverPassword = process.env.OPENCODE_SERVER_PASSWORD
    const serverUsername = process.env.OPENCODE_SERVER_USERNAME ?? "opencode"

    const options: { baseUrl: string; headers?: Record<string, string> } = { baseUrl: baseUrl }

    if (serverPassword) {
      options.headers = {
        Authorization: createAuthHeader(serverUsername, serverPassword),
      }
    }

    const sdkClient = createOpencodeClient(options)
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
