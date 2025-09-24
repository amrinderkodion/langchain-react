// src/tools/vectorDbTool.js

import { DynamicTool } from "@langchain/core/tools";
import { z } from "zod";
import { searchDocuments } from "../services/vectorDbService";

export const createVectorDbTool = () => {
  return new DynamicTool({
    name: "vectordb",
    description: "Searches saved documents for relevant information. Use this tool only if the user's question likely depends on stored knowledge. If you already know the answer, do not call this tool.",
    schema: z.object({
      query: z.string().describe("The search query string."),
    }),
    func: async ({ query }) => {
      const results = await searchDocuments(query);
      return results.map(doc => doc.pageContent).join("\n\n");
    },
  });
};