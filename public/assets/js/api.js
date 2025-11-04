export async function api(path, { method = "GET", body } = {}) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const err = new Error(
      (isJson && (data.error || data.message)) || res.statusText
    );
    err.status = res.status;
    err.data = isJson ? data : { raw: data };
    throw err;
  }
  return data;
}
