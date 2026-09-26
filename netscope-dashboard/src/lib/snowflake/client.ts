import snowflake from "snowflake-sdk";

let connection: snowflake.Connection | null = null;
let connectPromise: Promise<void> | null = null;

function getConnection(): snowflake.Connection {
  if (!connection) {
    connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USER!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
      role: process.env.SNOWFLAKE_ROLE,
    });
  }
  return connection;
}

export function connectSnowflake(): Promise<void> {
  const conn = getConnection();
  if (conn.isUp()) return Promise.resolve();

  // memoize so concurrent callers await the same in-flight connect
  // instead of each calling conn.connect() at once
  if (!connectPromise) {
    connectPromise = new Promise((resolve, reject) => {
      conn.connect((err) => {
        connectPromise = null;
        if (err) reject(err);
        else resolve();
      });
    });
  }
  return connectPromise;
}

export async function executeQuery<T = unknown>(
  sqlText: string,
  binds: (string | number | boolean | null)[] = [],
): Promise<T[]> {
  await connectSnowflake();
  const conn = getConnection();

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) reject(err);
        else resolve((rows ?? []) as T[]);
      },
    });
  });
}
