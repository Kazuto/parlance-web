import { type AnyOperation, Operation } from "./operations";

type ApiRecord = { [key: string]: AnyOperation | ApiRecord };

export function defineApi<T extends ApiRecord>(
  record: T,
  endpointName?: string,
): T {
  for (const [key, value] of Object.entries(record)) {
    const currentEndpointName = endpointName ? `${endpointName}.${key}` : key;

    if (value instanceof Operation) {
      value.key = currentEndpointName;
    } else {
      defineApi(value, currentEndpointName);
    }
  }

  return record;
}
