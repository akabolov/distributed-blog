import Fastify from "fastify";
import { randomBytes } from "node:crypto";
import cors from "@fastify/cors";
import { request } from "undici";

const fastify = Fastify({
  logger: { msgPrefix: "POSTS SERVICE: " },
});

await fastify.register(cors, {});

const Posts = {};

fastify.get("/posts", async (req, reply) => {
  return reply.code(200).send(Posts);
});

fastify.post("/posts/create", async (req, reply) => {
  const title = req?.body?.title;
  const id = randomBytes(4).toString("hex");

  Posts[id] = { title, id };

  await request("http://event-bus-srv:4005/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "PostCreated",
      data: Posts[id],
    }),
  });

  return reply.code(201).send(Posts[id]);
});

fastify.post("/events", async (req, reply) => {
  console.log("Event Received: ", req.body);
});

const start = async () => {
  try {
    await fastify.listen({ port: 4000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
