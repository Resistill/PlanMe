interface TrackedDoc {
  docId: string;
  revision: number;
  lastModified: string;
}

const STORAGE_KEY = "planme-sync-tracker";

export function getTrackedDocs(): Record<string, TrackedDoc> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setTrackedDoc(filename: string, doc: TrackedDoc) {
  const docs = getTrackedDocs();
  docs[filename] = doc;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function removeTrackedDoc(filename: string) {
  const docs = getTrackedDocs();
  delete docs[filename];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function clearTrackedDocs() {
  localStorage.removeItem(STORAGE_KEY);
}
