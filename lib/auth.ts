import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function getCoupleIdFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.replace("Bearer ", "");

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
            coupleId: string;
            email: string;
        };
        return payload.coupleId;
    } catch (error) {
        return null;
    }
}