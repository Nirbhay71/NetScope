import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/client";

export async function GET() {
  try {
    const rows = await executeQuery(
      "SELECT CURRENT_DATABASE() AS DB_NAME, CURRENT_WAREHOUSE() AS WH_NAME",
    );

    return NextResponse.json({
      status: "connected",
      snowflake: rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Snowflake connection failed",
      },
      { status: 500 },
    );
  }
}
