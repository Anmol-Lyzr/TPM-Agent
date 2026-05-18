/** Strip undefined/non-JSON values so MongoDB BSON serialization never fails. */
export function sanitizeForMongo<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
