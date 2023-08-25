import Fastify from "fastify";
import cors from "@fastify/cors";
import { request } from "undici";

const fastify = Fastify({
  logger: { target: "pino-pretty", msgPrefix: "MODERATION SERVICE " },
});

process.on("unhandledRejection", (reason) => {
  console.error(reason);
});

await fastify.register(cors, {});

fastify.post("/events", async (req, reply) => {
  const { type, data } = req.body;

  if (type === "CommentCreated") {
    const status = data.content.includes("orange") ? "rejected" : "approved";

    await request("http://event-bus-srv:4005/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "CommentModerated",
        data: {
          id: data.id,
          content: data.content,
          postId: data.postId,
          status,
        },
      }),
    });

    return {};
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 4003, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
