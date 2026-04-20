import { resolveCliDocumentPath } from "./resolve-cli-document-path.ts";
import {
  createValidateCliResult,
  type ValidateCliResult,
} from "./validate-result.ts";

export interface ValidateDocumentPathOptions {
  path: string;
  repoRoot?: string;
}

export async function validateDocumentPath(
  options: ValidateDocumentPathOptions,
): Promise<ValidateCliResult> {
  const resolvedDocument = await resolveCliDocumentPath(options);

  return createValidateCliResult(resolvedDocument);
}
