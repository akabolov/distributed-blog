import Fastify from "fastify";
import cors from "@fastify/cors";
import { request } from "undici";

const fastify = Fastify({
  logger: {
    target: "pino-pretty",
    msgPrefix: "EVENT BUS ",
  },
});

await fastify.register(cors, {});

const events = [];

fastify.get("/events", async (req, reply) => {
  return events;
});

fastify.post("/events", async (req, reply) => {
  try {
    const event = req.body;
    console.log("NEW EVENT", event);

    events.push(event);

    await request("http://posts-clusterip-srv:4000/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    await request("http://comments-srv:4001/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    await request("http://query-srv:4002/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    await request("http://moderation-srv:4003/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    return reply.code(200).send({ status: "OK" });
  } catch (error) {
    console.error(error);
  }
});

await fastify.listen({
  port: 4005,
  host: "0.0.0.0",
});
