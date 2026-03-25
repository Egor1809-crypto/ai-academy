import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, tariff } = body;

    if (!name || !phone || !tariff) {
      return NextResponse.json({ error: "Заполните обязательные поля" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: { name, phone, email: email || null, tariff },
    });

    return NextResponse.json({ success: true, id: lead.id });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}
