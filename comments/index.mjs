import Fastify from "fastify";
import { randomBytes } from "node:crypto";
import cors from "@fastify/cors";
import { request } from "undici";

const fastify = Fastify({
  logger: { target: "pino-pretty", msgPrefix: "COMMENTS SERVICE " },
});

process.on("unhandledRejection", (reason) => {
  console.error(reason);
});

await fastify.register(cors, {});

const commentsByPostId = {};

fastify.get("/posts/:id/comments", async (req, reply) => {
  return reply.code(200).send(commentsByPostId[req.params.id] || []);
});

fastify.post("/posts/:id/comments", async (req, reply) => {
  try {
    const commentId = randomBytes(4).toString("hex");
    const { content } = req.body;

    const comments = commentsByPostId[req.params.id] || [];

    comments.push({ id: commentId, content, status: "pending" });

    commentsByPostId[req.params.id] = comments;

    await request("http://event-bus-srv:4005/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "CommentCreated",
        data: {
          id: commentId,
          content,
          postId: req.params.id,
          status: "pending",
        },
      }),
    });

    return reply.code(201).send(comments);
  } catch (error) {
    console.error(error);
  }
});

fastify.post("/events", async (req, reply) => {
  console.log("Event Received: ", req.body);

  const { type, data } = req.body;

  if (type === "CommentModerated") {
    const { id, postId, status, content } = data;

    const comments = commentsByPostId[postId];

    const comment = comments.find((comment) => {
      return comment.id === id;
    });

    comment.status = status;

    await request("http://event-bus-srv:4005/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "CommentUpdated",
        data: {
          id,
          content,
          postId,
          status,
        },
      }),
    });
  }

  reply.send({});
});

const start = async () => {
  try {
    await fastify.listen({ port: 4001, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
