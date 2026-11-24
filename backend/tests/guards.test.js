import request from "supertest";
import app from "../app.js";

describe("route guards", () => {
    test("POST /api/news without a token returns 401", async () => {
        const res = await request(app)
            .post("/api/news")
            .send({});

        expect(res.status).toBe(401);
    });

    test("DELETE /api/news/123 without a token returns 401", async () => {
        const res = await request(app)
            .delete("/api/news/123");

        expect(res.status).toBe(401);
    });

    test("POST /api/ai/news/123/analyze without a token returns 401", async () => {
        const res = await request(app)
            .post("/api/ai/news/123/analyze");

        expect(res.status).toBe(401);
    });

    test("GET /health returns 200", async () => {
        const res = await request(app)
            .get("/health");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });
});
