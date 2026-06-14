import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb, users } from "@/lib/db";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;
  const db = getDb();

  const passwordHash = await bcrypt.hash(password, 12);

  // Insert and rely on the UNIQUE(email) constraint to reject duplicates. This
  // avoids a check-then-insert race and avoids confirming whether an email is
  // registered (account-enumeration) via a distinct error/status.
  try {
    const [created] = await db
      .insert(users)
      .values({ email, name: name ?? null, passwordHash })
      .returning({ id: users.id, email: users.email });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    // Unique-violation or any insert error → generic response.
    return NextResponse.json(
      { error: "Unable to register with the provided details." },
      { status: 400 }
    );
  }
}
